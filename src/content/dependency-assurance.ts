import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";
import { dependencyAssuranceModule } from "./dependency-assurance-module";

const reviewedAt = "2026-09-18";

export const dependencyAssuranceSources: Source[] = [
  {
    id: "cargo-tree-diagnostics-reference",
    title: "The Cargo Book: cargo tree",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-tree.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie filtrów grafu, duplicate dependencies albo przykładowych komend cargo tree.",
  },
  {
    id: "cargo-manifest-license-reference",
    title: "The Cargo Book: package metadata",
    url: "https://doc.rust-lang.org/cargo/reference/manifest.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie pól license, repository, source albo polityki publikacji.",
  },
  {
    id: "rustsec-advisory-database",
    title: "RustSec Advisory Database",
    url: "https://github.com/RustSec/advisory-db",
    classification: "dynamic",
    reviewedAt,
    recheckPolicy:
      "Przypinaj snapshot i datę przeglądu; sprawdzaj przy każdej zmianie narzędzia lub bazy advisory.",
  },
  {
    id: "cargo-deny-reference",
    title: "cargo-deny documentation",
    url: "https://embarkstudios.github.io/cargo-deny/",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj wersję cargo-deny, składnię deny.toml i znaczenie trybów advisories, bans oraz licenses.",
  },
  {
    id: "cargo-package-dossier-reference",
    title: "The Cargo Book: cargo package",
    url: "https://doc.rust-lang.org/cargo/commands/cargo-package.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie granicy archiwum, lockfile albo artefaktów zewnętrznego konsumenta.",
  },
];

export const dependencyAssuranceCompetencies: Competency[] = [
  {
    id: "diagnose-dependency-conflicts",
    title:
      "Czytasz dowód grafu zależności i rozpoznajesz duplicate package/version/source przed wydaniem.",
  },
  {
    id: "enforce-source-license-policy",
    title:
      "Ograniczasz źródła i licencje zależności przez jawny, fail-closed kontrakt.",
  },
  {
    id: "bound-advisory-exceptions",
    title:
      "Stosujesz wyjątek advisory tylko do wstrzykniętej daty, właściciela, uzasadnienia i zakresu.",
  },
  {
    id: "decide-release-from-evidence",
    title:
      "Podejmujesz decyzję release z przypiętego manifestu artefaktów i zatrzymujesz ją przy brakującym dowodzie.",
  },
];

export const dependencyAssuranceConcepts: Concept[] = [
  {
    id: "dependency-graph-diagnosis",
    title: "Diagnoza grafu zależności",
    prerequisites: ["cargo-dependency-contract"],
    competencyIds: ["diagnose-dependency-conflicts"],
    reviewPrompt:
      "Co odróżnia duplicate dependency od zwykłego powtórzenia krawędzi w grafie?",
    reviewAnswer:
      "Duplicate dependency oznacza, że ten sam package jest wybrany w więcej niż jednej wersji albo ze źródła, którego polityka nie traktuje jako tego samego. Trzeba wskazać package, wersje, źródła i rodziców z cargo tree; sama liczba krawędzi nie jest konfliktem.",
    distinguish:
      "Cargo.toml opisuje wymagania, a cargo tree lub metadata pokazują rozwiązany graf. Dwie wersje tego samego package mogą kompilować się poprawnie, lecz zwiększają koszt i ryzyko; polityka może je odrzucić przed release.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "dependency-source-license-policy",
    title: "Polityka źródeł i licencji",
    prerequisites: ["dependency-graph-diagnosis"],
    competencyIds: ["enforce-source-license-policy"],
    reviewPrompt:
      "Dlaczego nieznane źródło albo licencja powinny kończyć się odmową?",
    reviewAnswer:
      "Allowlista jest kontraktem, więc wartość spoza niej nie ma dowodu akceptacji. `registry`, `git` i `path` muszą być rozróżnialne, a licencja musi być jawnie dozwolona; domyślne przepuszczenie unknown osłabia granicę polityki.",
    distinguish:
      "Licencja crate i źródło pobrania to różne pola. MIT z niezatwierdzonego git URL nadal wymaga decyzji o źródle, a registry package z nieznaną licencją nie przechodzi tylko dlatego, że źródło jest zaufane.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "dependency-advisory-exceptions",
    title: "Czasowy wyjątek advisory",
    prerequisites: ["dependency-source-license-policy"],
    competencyIds: ["bound-advisory-exceptions"],
    reviewPrompt:
      "Jak sprawdzić wyjątek advisory bez pobierania bieżącej daty z systemu?",
    reviewAnswer:
      "Przekaż datę oceny jako argument i porównaj ją z `expires_ymd`. Wyjątek jest aktywny wyłącznie do tej daty, ma identyfikator, właściciela, uzasadnienie i zakres package; po wygaśnięciu decyzja przechodzi w hold.",
    distinguish:
      "Wstrzyknięta data daje powtarzalny dowód i pozwala odtworzyć decyzję. `ignore = ...` bez daty, właściciela i scope może ukryć nowy problem i nie jest polityką release.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "dependency-release-dossier",
    title: "Dossier artefaktów i decyzja release",
    prerequisites: ["dependency-advisory-exceptions"],
    competencyIds: ["decide-release-from-evidence"],
    reviewPrompt:
      "Jakie dowody muszą być obecne, aby lokalne dossier mogło zwrócić Release?",
    reviewAnswer:
      "Manifest, lockfile, wynik polityki supply-chain, archiwum pakietu i zewnętrzny consumer muszą mieć niepuste identyfikatory lub statusy, a manifest musi zachować `publish = false`. Brak dowodu, pusty hash albo włączone publikowanie daje Hold.",
    distinguish:
      "Dossier wiąże decyzję z konkretnymi artefaktami; zielony check bez ich nazw i hashy nie jest dowodem odtwarzalnym. `publish = false` ogranicza działanie fixture, ale nie zastępuje testu consumer ani kontroli lockfile.",
    evidenceArtifact: "rust-code",
  },
];

function choice(
  id: string,
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind: "predict",
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind: "prediction",
  };
}

function explain(
  id: string,
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: number,
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind: "explain",
    title,
    prompt,
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind: "exposure",
  };
}

function testsStep(options: {
  id: string;
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  evidenceGate?: boolean;
  kind?: "assessment" | "blank" | "recall";
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind ?? "assessment",
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind: options.kind === "recall" ? "recall" : "assessment",
    ...(options.evidenceGate ? { evidenceGate: true } : {}),
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
  };
}

const graphStarter = `#[derive(Debug, PartialEq, Eq)]
struct Package { name: &'static str, version: &'static str, source: &'static str }
#[derive(Debug, PartialEq, Eq)]
enum Finding { Clean, Duplicate(&'static str) }
fn diagnose(packages: &[Package]) -> Finding {
    let _ = packages;
    Finding::Clean
}`;
const graphSolution = `#[derive(Debug, PartialEq, Eq)]
struct Package { name: &'static str, version: &'static str, source: &'static str }
#[derive(Debug, PartialEq, Eq)]
enum Finding { Clean, Duplicate(&'static str) }
fn diagnose(packages: &[Package]) -> Finding {
    for (index, package) in packages.iter().enumerate() {
        if packages[index + 1..].iter().any(|other| other.name == package.name && (other.version != package.version || other.source != package.source)) {
            return Finding::Duplicate(package.name);
        }
    }
    Finding::Clean
}`;
const graphTests = `#[test]
fn detects_versions_and_sources_but_ignores_distinct_packages() {
    let packages = [
        Package { name: "serde", version: "1.0.229", source: "registry" },
        Package { name: "serde", version: "1.0.228", source: "registry" },
    ];
    assert_eq!(diagnose(&packages), Finding::Duplicate("serde"));
    let source_conflict = [
        Package { name: "serde", version: "1.0.229", source: "registry" },
        Package { name: "serde", version: "1.0.229", source: "git" },
    ];
    assert_eq!(diagnose(&source_conflict), Finding::Duplicate("serde"));
    let separate = [Package { name: "serde", version: "1.0.229", source: "registry" }, Package { name: "tokio", version: "1.0.53", source: "registry" }];
    assert_eq!(diagnose(&separate), Finding::Clean);
    assert_eq!(diagnose(&packages[..1]), Finding::Clean);
}`;
const graphBlankSolution = `#[derive(Debug, PartialEq, Eq)]
struct Edge { from: &'static str, package: &'static str, version: &'static str, source: &'static str }
#[derive(Debug, PartialEq, Eq)]
enum GraphResult { Clean, Conflict(&'static str), Cycle(&'static str) }
fn inspect_graph(edges: &[Edge]) -> GraphResult {
    if let Some(edge) = edges.iter().find(|edge| edge.from == edge.package) { return GraphResult::Cycle(edge.package); }
    for (index, edge) in edges.iter().enumerate() {
        if edges[index + 1..].iter().any(|other| other.package == edge.package && (other.version != edge.version || other.source != edge.source)) { return GraphResult::Conflict(edge.package); }
    }
    GraphResult::Clean
}`;
const graphBlankTests = `#[test]
fn blank_graph_contract_covers_version_source_and_cycle_shape() {
    let edges = [
        Edge { from: "app", package: "serde", version: "1.0.228", source: "registry" },
        Edge { from: "helper", package: "serde", version: "1.0.229", source: "registry" },
        Edge { from: "app", package: "helper", version: "1", source: "path" },
    ];
    assert_eq!(inspect_graph(&edges), GraphResult::Conflict("serde"));
    let cycle = [Edge { from: "app", package: "app", version: "1", source: "path" }];
    assert_eq!(inspect_graph(&cycle), GraphResult::Cycle("app"));
}`;
const graphRecallSolution = `#[derive(Debug, PartialEq, Eq)]
struct CrateRef { package: &'static str, version: &'static str, source: &'static str, selected: bool }
#[derive(Debug, PartialEq, Eq)]
enum GraphStatus { Stable, Conflict(&'static str) }
fn find_conflict(items: &[CrateRef]) -> GraphStatus {
    for (index, item) in items.iter().enumerate() {
        if item.selected && items[index + 1..].iter().any(|other| other.selected && other.package == item.package && (other.version != item.version || other.source != item.source)) { return GraphStatus::Conflict(item.package); }
    }
    GraphStatus::Stable
}`;
const graphRecallTests = `#[test]
fn recall_graph_uses_different_versions_and_parent_source() {
    let items = [CrateRef { package: "bytes", version: "1.5", source: "registry", selected: true }, CrateRef { package: "bytes", version: "1.4", source: "registry", selected: true }];
    assert_eq!(find_conflict(&items), GraphStatus::Conflict("bytes"));
    let clean = [CrateRef { package: "bytes", version: "1.4", source: "registry", selected: false }, CrateRef { package: "bytes", version: "1.5", source: "registry", selected: true }];
    assert_eq!(find_conflict(&clean), GraphStatus::Stable);
}`;
const graphReviewSolution = `#[derive(Debug, PartialEq, Eq)]
struct Dependency { name: &'static str, version: &'static str, source: &'static str, feature: &'static str }
#[derive(Debug, PartialEq, Eq)]
enum Review { Pass, Hold(&'static str) }
fn review_graph(dependencies: &[Dependency]) -> Review {
    for (index, dependency) in dependencies.iter().enumerate() {
        if dependencies[index + 1..].iter().any(|other| other.name == dependency.name && (other.version != dependency.version || other.source != dependency.source)) { return Review::Hold(dependency.name); }
    }
    Review::Pass
}`;
const graphReviewTests = `#[test]
fn review_graph_reports_a_feature_selected_source_conflict() {
    let dependencies = [Dependency { name: "ring", version: "0.17", source: "registry", feature: "tls" }, Dependency { name: "ring", version: "0.16", source: "git", feature: "legacy" }];
    assert_eq!(review_graph(&dependencies), Review::Hold("ring"));
    assert_eq!(review_graph(&dependencies[..1]), Review::Pass);
}`;

const policyStarter = `#[derive(Debug, PartialEq, Eq)]
enum Decision { Allow, Deny }
fn policy(source: &str, license: &str) -> Decision {
    let _ = (source, license);
    Decision::Allow
}`;
const policySolution = `#[derive(Debug, PartialEq, Eq)]
enum Decision { Allow, Deny }
fn policy(source: &str, license: &str) -> Decision {
    if source == "registry" && matches!(license, "MIT" | "Apache-2.0") { Decision::Allow } else { Decision::Deny }
}`;
const policyTests = `#[test]
fn allows_only_reviewed_registry_sources_and_licenses() {
    assert_eq!(policy("registry", "MIT"), Decision::Allow);
    assert_eq!(policy("registry", "Apache-2.0"), Decision::Allow);
    assert_eq!(policy("git", "MIT"), Decision::Deny);
    assert_eq!(policy("path", "Apache-2.0"), Decision::Deny);
    assert_eq!(policy("registry", "GPL-3.0"), Decision::Deny);
    assert_eq!(policy("registry", "UNKNOWN"), Decision::Deny);
}`;
const policyBlankSolution = `#[derive(Debug, PartialEq, Eq)]
enum Verdict { Accept, Reject }
fn check_source(origin: &str, spdx: &str) -> Verdict {
    if origin == "registry" && matches!(spdx, "MIT" | "Apache-2.0") { Verdict::Accept } else { Verdict::Reject }
}`;
const policyBlankTests = `#[test]
fn blank_policy_rejects_path_and_unknown_license() {
    assert_eq!(check_source("registry", "MIT"), Verdict::Accept);
    assert_eq!(check_source("path", "Apache-2.0"), Verdict::Reject);
    assert_eq!(check_source("registry", "UNKNOWN"), Verdict::Reject);
}`;
const policyRecallSolution = `#[derive(Debug, PartialEq, Eq)]
enum PolicyDecision { Permit, Block }
fn allow_dependency(origin: &str, license: &str) -> PolicyDecision {
    if origin == "registry" && matches!(license, "MIT" | "Apache-2.0") { PolicyDecision::Permit } else { PolicyDecision::Block }
}`;
const policyRecallTests = `#[test]
fn recall_policy_separates_path_and_license() {
    assert_eq!(allow_dependency("registry", "Apache-2.0"), PolicyDecision::Permit);
    assert_eq!(allow_dependency("git", "MIT"), PolicyDecision::Block);
    assert_eq!(allow_dependency("registry", "BSD-3-Clause"), PolicyDecision::Block);
}`;
const policyReviewSolution = `#[derive(Debug, PartialEq, Eq)]
enum PolicyResult { Allowed, Denied }
fn approve(origin: &str, license: &str) -> PolicyResult {
    if origin == "registry" && (license == "MIT" || license == "Apache-2.0") { PolicyResult::Allowed } else { PolicyResult::Denied }
}`;
const policyReviewTests = `#[test]
fn review_policy_is_fail_closed_for_unknown_origin() {
    assert_eq!(approve("registry", "MIT"), PolicyResult::Allowed);
    assert_eq!(approve("path", "MIT"), PolicyResult::Denied);
    assert_eq!(approve("registry", "GPL-3.0"), PolicyResult::Denied);
}`;

const advisoryStarter = `#[derive(Debug, PartialEq, Eq)]
struct Exception { id: &'static str, package: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }
fn active(exception: &Exception, as_of_ymd: u32) -> bool {
    let _ = as_of_ymd;
    !exception.id.is_empty() && !exception.package.is_empty() && !exception.owner.is_empty() && !exception.scope.is_empty() && !exception.reason.is_empty()
}`;
const advisorySolution = `#[derive(Debug, PartialEq, Eq)]
struct Exception { id: &'static str, package: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }
fn active(exception: &Exception, as_of_ymd: u32) -> bool {
    !exception.id.is_empty() && !exception.package.is_empty() && !exception.owner.is_empty() && !exception.scope.is_empty() && !exception.reason.is_empty() && exception.expires_ymd >= as_of_ymd
}`;
const advisoryTests = `#[test]
fn injected_date_controls_exception_expiry() {
    let exception = Exception { id: "RUSTSEC-2026-0001", package: "serde", owner: "platform", scope: "frame-protocol", reason: "fix scheduled", expires_ymd: 20260930 };
    assert!(active(&exception, 20260918));
    assert!(active(&exception, 20260930));
    assert!(!active(&exception, 20261001));
    assert!(!active(&Exception { owner: "", ..exception }, 20260918));
}`;
const advisoryBlankSolution = `#[derive(Debug, PartialEq, Eq)]
struct AdvisoryException { advisory: &'static str, package: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }
fn is_current(exception: &AdvisoryException, as_of_ymd: u32) -> bool {
    !exception.advisory.is_empty() && !exception.package.is_empty() && !exception.owner.is_empty() && !exception.scope.is_empty() && !exception.reason.is_empty() && exception.expires_ymd >= as_of_ymd
}`;
const advisoryBlankTests = `#[test]
fn blank_advisory_checks_owner_reason_scope_and_date() {
    let exception = AdvisoryException { advisory: "RUSTSEC-2026-0002", package: "bytes", owner: "runtime", scope: "default", reason: "upstream patch", expires_ymd: 20261001 };
    assert!(is_current(&exception, 20260918));
    assert!(!is_current(&AdvisoryException { advisory: "RUSTSEC-2026-0002", package: "bytes", owner: "runtime", scope: "default", reason: "", expires_ymd: 20261001 }, 20260918));
    assert!(!is_current(&AdvisoryException { advisory: "RUSTSEC-2026-0002", package: "bytes", owner: "runtime", scope: "default", reason: "upstream patch", expires_ymd: 20261002 }, 20261003));
}`;
const advisoryRecallSolution = `#[derive(Debug, PartialEq, Eq)]
struct Waiver { advisory: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }
fn usable(waiver: &Waiver, today: u32) -> bool {
    !waiver.advisory.is_empty() && !waiver.owner.is_empty() && !waiver.scope.is_empty() && !waiver.reason.is_empty() && today <= waiver.expires_ymd
}`;
const advisoryRecallTests = `#[test]
fn recall_advisory_rejects_empty_scope_and_past_expiry() {
    let waiver = Waiver { advisory: "RUSTSEC-2026-0003", owner: "security", scope: "feature-x", reason: "migration", expires_ymd: 20260925 };
    assert!(usable(&waiver, 20260918));
    assert!(!usable(&Waiver { advisory: "RUSTSEC-2026-0003", owner: "security", scope: "", reason: "migration", expires_ymd: 20260925 }, 20260918));
    assert!(!usable(&waiver, 20260926));
}`;
const advisoryReviewSolution = `#[derive(Debug, PartialEq, Eq)]
struct ExceptionRecord { advisory: &'static str, package: &'static str, owner: &'static str, reason: &'static str, expires_ymd: u32 }
fn within_window(record: &ExceptionRecord, as_of_ymd: u32) -> bool {
    !record.advisory.is_empty() && !record.package.is_empty() && !record.owner.is_empty() && !record.reason.is_empty() && record.expires_ymd >= as_of_ymd
}`;
const advisoryReviewTests = `#[test]
fn review_advisory_requires_identity_reason_and_date() {
    let record = ExceptionRecord { advisory: "RUSTSEC-2026-0004", package: "ring", owner: "release", reason: "patch window", expires_ymd: 20261015 };
    assert!(within_window(&record, 20260918));
    assert!(!within_window(&ExceptionRecord { advisory: "", package: "ring", owner: "release", reason: "patch window", expires_ymd: 20261015 }, 20260918));
    assert!(!within_window(&ExceptionRecord { advisory: "RUSTSEC-2026-0004", package: "ring", owner: "release", reason: "", expires_ymd: 20261015 }, 20260918));
    assert!(!within_window(&record, 20261016));
}`;

const dossierStarter = `#[derive(Debug, PartialEq, Eq)]
struct Dossier<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, artifact: &'a str, config: &'a str, consumer: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum ReleaseDecision { Release, Hold }
fn decide(dossier: &Dossier<'_>) -> ReleaseDecision {
    let _ = dossier;
    ReleaseDecision::Release
}`;
const dossierSolution = `#[derive(Debug, PartialEq, Eq)]
struct Dossier<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, artifact: &'a str, config: &'a str, consumer: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum ReleaseDecision { Release, Hold }
fn decide(dossier: &Dossier<'_>) -> ReleaseDecision {
    if !dossier.manifest.is_empty() && !dossier.lock.is_empty() && !dossier.audit.is_empty() && !dossier.artifact.is_empty() && !dossier.config.is_empty() && dossier.consumer && !dossier.publish { ReleaseDecision::Release } else { ReleaseDecision::Hold }
}`;
const dossierTests = `#[test]
fn release_requires_artifact_config_consumer_and_publish_false() {
    let complete = Dossier { manifest: "sha256:manifest", lock: "sha256:lock", audit: "sha256:audit", artifact: "sha256:archive", config: "deny.toml", consumer: true, publish: false };
    assert_eq!(decide(&complete), ReleaseDecision::Release);
    assert_eq!(decide(&Dossier { manifest: "", lock: "sha256:lock", audit: "sha256:audit", artifact: "sha256:archive", config: "deny.toml", consumer: true, publish: false }), ReleaseDecision::Hold);
    assert_eq!(decide(&Dossier { artifact: "", lock: "sha256:lock", manifest: "sha256:manifest", audit: "sha256:audit", config: "deny.toml", consumer: true, publish: false }), ReleaseDecision::Hold);
    assert_eq!(decide(&Dossier { config: "", lock: "sha256:lock", manifest: "sha256:manifest", audit: "sha256:audit", artifact: "sha256:archive", consumer: true, publish: false }), ReleaseDecision::Hold);
    assert_eq!(decide(&Dossier { consumer: false, lock: "sha256:lock", manifest: "sha256:manifest", audit: "sha256:audit", artifact: "sha256:archive", config: "deny.toml", publish: false }), ReleaseDecision::Hold);
    assert_eq!(decide(&Dossier { publish: true, lock: "sha256:lock", manifest: "sha256:manifest", audit: "sha256:audit", artifact: "sha256:archive", config: "deny.toml", consumer: true }), ReleaseDecision::Hold);
}`;
const dossierBlankSolution = `#[derive(Debug, PartialEq, Eq)]
struct ReleaseDossier<'a> { manifest: &'a str, lockfile: &'a str, policy: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum Decision { Release, Hold }
fn evaluate(dossier: &ReleaseDossier<'_>) -> Decision {
    if !dossier.manifest.is_empty() && !dossier.lockfile.is_empty() && !dossier.policy.is_empty() && !dossier.archive.is_empty() && !dossier.config.is_empty() && dossier.consumer && !dossier.publish { Decision::Release } else { Decision::Hold }
}`;
const dossierBlankTests = `#[test]
fn blank_dossier_rejects_missing_policy_and_consumer() {
    let complete = ReleaseDossier { manifest: "manifest", lockfile: "lock", policy: "audit", archive: "zip", config: "deny", consumer: true, publish: false };
    assert_eq!(evaluate(&complete), Decision::Release);
    assert_eq!(evaluate(&ReleaseDossier { manifest: "manifest", lockfile: "lock", policy: "", archive: "zip", config: "deny", consumer: true, publish: false }), Decision::Hold);
    assert_eq!(evaluate(&ReleaseDossier { manifest: "manifest", lockfile: "lock", policy: "audit", archive: "zip", config: "deny", consumer: false, publish: false }), Decision::Hold);
}`;
const dossierRecallSolution = `#[derive(Debug, PartialEq, Eq)]
struct EvidenceBundle<'a> { artifact: &'a str, config: &'a str, consumer: bool, missing_evidence: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum Status { Ready, Hold }
fn release_status(bundle: &EvidenceBundle<'_>) -> Status {
    if !bundle.artifact.is_empty() && !bundle.config.is_empty() && bundle.consumer && !bundle.missing_evidence && !bundle.publish { Status::Ready } else { Status::Hold }
}`;
const dossierRecallTests = `#[test]
fn recall_dossier_treats_missing_evidence_as_hold() {
    let ready = EvidenceBundle { artifact: "zip-sha", config: "deny.toml", consumer: true, missing_evidence: false, publish: false };
    assert_eq!(release_status(&ready), Status::Ready);
    assert_eq!(release_status(&EvidenceBundle { artifact: "zip-sha", config: "deny.toml", consumer: true, missing_evidence: true, publish: false }), Status::Hold);
    assert_eq!(release_status(&EvidenceBundle { artifact: "", config: "deny.toml", consumer: true, missing_evidence: false, publish: false }), Status::Hold);
}`;
const dossierReviewSolution = `#[derive(Debug, PartialEq, Eq)]
struct ReleaseProof<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, artifact: &'a str, config: &'a str, consumer: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum Outcome { Ship, Stop }
fn release(proof: &ReleaseProof<'_>) -> Outcome {
    if !proof.manifest.is_empty() && !proof.lock.is_empty() && !proof.audit.is_empty() && !proof.artifact.is_empty() && !proof.config.is_empty() && proof.consumer && !proof.publish { Outcome::Ship } else { Outcome::Stop }
}`;
const dossierReviewTests = `#[test]
fn review_dossier_stops_when_lock_evidence_is_missing() {
    let proof = ReleaseProof { manifest: "manifest", lock: "lock", audit: "audit", artifact: "archive", config: "deny", consumer: true, publish: false };
    assert_eq!(release(&proof), Outcome::Ship);
    assert_eq!(release(&ReleaseProof { manifest: "manifest", lock: "", audit: "audit", artifact: "archive", config: "deny", consumer: true, publish: false }), Outcome::Stop);
    assert_eq!(release(&ReleaseProof { manifest: "manifest", lock: "lock", audit: "audit", artifact: "archive", config: "deny", consumer: true, publish: true }), Outcome::Stop);
}`;

export const dependencyAssuranceLessons: Lesson[] = [
  {
    id: "dependency-graph-diagnosis",
    moduleId: dependencyAssuranceModule.id,
    conceptIds: ["dependency-graph-diagnosis"],
    competencyIds: ["diagnose-dependency-conflicts"],
    prerequisites: ["cargo-package-rehearsal"],
    title: "Najpierw przeczytaj graf",
    subtitle:
      "Odróżnisz deklarację od rozwiązania i znajdziesz duplicate package przed decyzją release.",
    minutes: 28,
    outcomes: [
      "Rozpoznasz różne wersje lub źródła tego samego package.",
      "Zachowasz nazwę package w dowodzie konfliktu.",
      "Nie uznasz samego cargo check za dowód braku duplikatów.",
    ],
    steps: [
      choice(
        "dependency-graph-diagnosis-predict",
        "Przewidź konflikt",
        "Graf zawiera serde 1.0.229 z registry i serde 1.0.228 z registry. Co jest właściwym sygnałem do zatrzymania release?",
        [
          "Ten sam package występuje w dwóch wyborach wersji",
          "Dwie krawędzie do jednej wersji zawsze są błędem",
          "Cargo.toml nie ma tabeli grafu",
        ],
        0,
        [
          "Różne wersje tego samego package są obserwowalnym konfliktem polityki.",
          "Powtórzenie krawędzi nie oznacza dwóch wyborów.",
          "Graf wynika z Cargo metadata/tree, nie z dodatkowej tabeli w manifeście.",
        ],
      ),
      explain(
        "dependency-graph-diagnosis-explain",
        "Diagnoza źródła",
        "Dlaczego w dowodzie konfliktu trzeba zapisać także source?",
        [
          "Bo ta sama nazwa i wersja z registry oraz git to różne pochodzenie",
          "Bo source zastępuje wersję",
          "Bo cargo tree zawsze ukrywa rodziców",
        ],
        0,
        [
          "Source jest częścią tożsamości pochodzenia i osobną granicą polityki.",
          "Wersja i source odpowiadają na różne pytania.",
          "Dowód powinien właśnie pokazać rodziców i krawędzie, nie je ukrywać.",
        ],
      ),
      testsStep({
        id: "dependency-graph-diagnosis-gate",
        title: "Wykryj duplicate package",
        prompt:
          "Zaimplementuj `diagnose`, która zwraca `Duplicate(name)` tylko wtedy, gdy ten sam package ma inną wersję lub source. Pusty i jednoelementowy graf jest czysty.",
        code: graphStarter,
        solution: graphSolution,
        tests: graphTests,
        evidenceGate: true,
      }),
      testsStep({
        id: "dependency-graph-diagnosis-blank",
        title: "Od pustej kartki: graf",
        prompt:
          "Od pustej kartki zdefiniuj dokładnie `#[derive(Debug, PartialEq, Eq)] struct Edge { from: &'static str, package: &'static str, version: &'static str, source: &'static str }`, `#[derive(Debug, PartialEq, Eq)] enum GraphResult { Clean, Conflict(&'static str), Cycle(&'static str) }` oraz `fn inspect_graph(edges: &[Edge]) -> GraphResult`. Zwróć `Cycle(package)`, gdy `from == package`, albo `Conflict(package)`, gdy ten sam package ma inną wersję lub source; w przeciwnym razie zwróć `Clean`. Przetestuj parę serde 1.0.228/1.0.229 oraz self-cycle `app -> app`; używaj wyłącznie argumentu funkcji.",
        solution: graphBlankSolution,
        tests: graphBlankTests,
        evidenceGate: true,
        kind: "blank",
      }),
      testsStep({
        id: "dependency-graph-diagnosis-recall",
        title: "Powtórka: rodzic i wersja",
        prompt:
          "Zaimplementuj samodzielnie `#[derive(Debug, PartialEq, Eq)] struct CrateRef { package: &'static str, version: &'static str, source: &'static str, selected: bool }`, `#[derive(Debug, PartialEq, Eq)] enum GraphStatus { Stable, Conflict(&'static str) }` oraz `fn find_conflict(items: &[CrateRef]) -> GraphStatus`. Porównuj tylko rekordy z `selected == true`; dla dwóch selected wpisów `bytes` w wersjach 1.5 i 1.4 zwróć `Conflict(\"bytes\")`, a gdy 1.4 ma `selected: false`, zwróć `Stable`.",
        solution: graphRecallSolution,
        tests: graphRecallTests,
        kind: "recall",
      }),
    ],
    misconceptions: [
      "Cargo.toml jest dowodem rozwiązanej wersji.",
      "Każde powtórzenie package oznacza błąd.",
      "Source nie należy do dowodu grafu.",
    ],
    transferTask:
      "Zapisz w dossier package, wersję, source i rodziców dla każdego duplicate; rozdziel warning od polityki, która faktycznie blokuje release.",
    evidenceGate:
      "Dwie bramki wymagają wykrycia różnych wersji lub źródeł tego samego package oraz świeżej implementacji od pustej kartki.",
    sourceIds: ["cargo-tree-diagnostics-reference"],
  },
  {
    id: "dependency-source-license-policy",
    moduleId: dependencyAssuranceModule.id,
    conceptIds: ["dependency-source-license-policy"],
    competencyIds: ["enforce-source-license-policy"],
    prerequisites: ["dependency-graph-diagnosis"],
    title: "Allowlista nie zgaduje",
    subtitle:
      "Rozdzielisz źródło pobrania od licencji i odrzucisz każdą nieznaną wartość.",
    minutes: 27,
    outcomes: [
      "Ograniczysz policy do registry i jawnych licencji.",
      "Odrzucisz git, path i nieznaną licencję.",
      "Nie pomylisz metadanych crate z pochodzeniem źródła.",
    ],
    steps: [
      choice(
        "dependency-source-license-policy-predict",
        "Przewidź odmowę",
        "Package ma licencję MIT, ale pochodzi z niezatwierdzonego git URL. Jaka decyzja jest fail-closed?",
        [
          "Deny, bo źródło wymaga osobnej zgody",
          "Allow, bo licencja zawsze wystarcza",
          "Allow tylko dlatego, że git jest szybszy",
        ],
        0,
        [
          "Źródło i licencja są niezależnymi warunkami allowlisty.",
          "Licencja nie autoryzuje pochodzenia.",
          "Szybkość nie jest dowodem zaufania.",
        ],
      ),
      explain(
        "dependency-source-license-policy-explain",
        "Nieznane znaczy deny",
        "Dlaczego `license = UNKNOWN` nie może przejść przez domyślną gałąź?",
        [
          "Bo allowlista ma jawny zbiór i brak wpisu nie jest zgodą",
          "Bo UNKNOWN oznacza MIT",
          "Bo cargo-deny zmienia licencję w lockfile",
        ],
        0,
        [
          "Brak dowodu akceptacji musi zatrzymać release.",
          "Nieznana wartość nie ma semantyki MIT.",
          "Lockfile zapisuje wybór, nie naprawia metadanych licencji.",
        ],
      ),
      testsStep({
        id: "dependency-source-license-policy-gate",
        title: "Zastosuj źródło i licencję",
        prompt:
          "Zaimplementuj `policy(source, license)`: Allow wyłącznie dla `registry` oraz `MIT` lub `Apache-2.0`; wszystkie inne kombinacje dają Deny.",
        code: policyStarter,
        solution: policySolution,
        tests: policyTests,
        evidenceGate: true,
      }),
      testsStep({
        id: "dependency-source-license-policy-blank",
        title: "Od pustej kartki: fail-closed",
        prompt:
          'Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq)] enum Verdict { Accept, Reject }` oraz `fn check_source(origin: &str, spdx: &str) -> Verdict`. Zwróć `Accept` tylko dla wejść `("registry", "MIT")` i `("registry", "Apache-2.0")`; dla `("path", "Apache-2.0")` oraz `("registry", "UNKNOWN")` zwróć `Reject`. Nie dodawaj domyślnej zgody.',
        solution: policyBlankSolution,
        tests: policyBlankTests,
        evidenceGate: true,
        kind: "blank",
      }),
      testsStep({
        id: "dependency-source-license-policy-recall",
        title: "Powtórka: dwa warunki",
        prompt:
          'Zaimplementuj `#[derive(Debug, PartialEq, Eq)] enum PolicyDecision { Permit, Block }` oraz `fn allow_dependency(origin: &str, license: &str) -> PolicyDecision`. Dla `("registry", "Apache-2.0")` zwróć `Permit`; dla `("git", "MIT")` i `("registry", "BSD-3-Clause")` zwróć `Block`, zachowując osobne sprawdzenie origin i license.',
        solution: policyRecallSolution,
        tests: policyRecallTests,
        kind: "recall",
      }),
    ],
    misconceptions: [
      "Licencja zastępuje source policy.",
      "Nieznane metadane można przepuścić do późniejszej publikacji.",
      "Path dependency jest zawsze równoważna registry.",
    ],
    transferTask:
      "Zaproponuj zmianę allowlisty jako reviewable diff: wskaż package, source, licencję, powód i osobę zatwierdzającą.",
    evidenceGate:
      "Dwie bramki wymagają dokładnej allowlisty registry/MIT/Apache-2.0 oraz niezależnego blanku, który odrzuca nieznane kombinacje.",
    sourceIds: ["cargo-manifest-license-reference", "cargo-deny-reference"],
  },
  {
    id: "dependency-advisory-exceptions",
    moduleId: dependencyAssuranceModule.id,
    conceptIds: ["dependency-advisory-exceptions"],
    competencyIds: ["bound-advisory-exceptions"],
    prerequisites: ["dependency-source-license-policy"],
    title: "Wyjątek ma datę końcową",
    subtitle:
      "Wprowadzisz czasową, odtwarzalną decyzję advisory z datą przekazaną przez caller.",
    minutes: 27,
    outcomes: [
      "Wstrzykniesz datę oceny zamiast czytać zegar.",
      "Odróżnisz aktywny wyjątek od wygasłego.",
      "Wymusisz identyfikator i właściciela wyjątku.",
    ],
    steps: [
      choice(
        "dependency-advisory-exceptions-predict",
        "Przewidź wygaśnięcie",
        "Dziś w verifierze jest argument `as_of_ymd = 20260918`, a wyjątek wygasa 20260917. Co powinno się stać?",
        [
          "Hold, bo wyjątek jest wygasły",
          "Release, bo advisory ma stary numer",
          "Verifier pobiera systemową datę i wybiera później",
        ],
        0,
        [
          "Wstrzyknięta data po expiry zamyka wyjątek.",
          "Numer advisory nie określa ważności wyjątku.",
          "Systemowa data zrywa powtarzalność dowodu.",
        ],
      ),
      explain(
        "dependency-advisory-exceptions-explain",
        "Zakres wyjątku",
        "Który zestaw pól pozwala odtworzyć wyjątek?",
        [
          "ID advisory, owner, package scope, reason i expires_ymd",
          "Tylko lista ignore bez daty",
          "Losowy komentarz w Cargo.lock",
        ],
        0,
        [
          "Każde pole wiąże decyzję z odpowiedzialnością i czasem.",
          "Ignore bez expiry może trwać bez końca.",
          "Lockfile nie jest rejestrem decyzji człowieka.",
        ],
      ),
      testsStep({
        id: "dependency-advisory-exceptions-gate",
        title: "Sprawdź datę wstrzykniętą",
        prompt:
          "Zaimplementuj `active(&Exception, as_of_ymd)`. Zwróć true tylko dla niepustego ID, package, ownera, scope i reason oraz `expires_ymd >= as_of_ymd`; nie pobieraj daty z systemu.",
        code: advisoryStarter,
        solution: advisorySolution,
        tests: advisoryTests,
        evidenceGate: true,
      }),
      testsStep({
        id: "dependency-advisory-exceptions-blank",
        title: "Od pustej kartki: advisory ledger",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq)] struct AdvisoryException { advisory: &'static str, package: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }` oraz `fn is_current(exception: &AdvisoryException, as_of_ymd: u32) -> bool`. Wszystkie pola tekstowe muszą być niepuste, a `expires_ymd >= as_of_ymd` jest aktywne; odrzuć `reason == \"\"` i datę po expiry.",
        solution: advisoryBlankSolution,
        tests: advisoryBlankTests,
        evidenceGate: true,
        kind: "blank",
      }),
      testsStep({
        id: "dependency-advisory-exceptions-recall",
        title: "Powtórka: brak zegara",
        prompt:
          "Zaimplementuj `#[derive(Debug, PartialEq, Eq)] struct Waiver { advisory: &'static str, owner: &'static str, scope: &'static str, reason: &'static str, expires_ymd: u32 }` oraz `fn usable(waiver: &Waiver, today: u32) -> bool`. Dla advisory `RUSTSEC-2026-0003`, ownera `security`, scope `feature-x`, reason `migration` i expiry `20260925` zwróć true dla `today = 20260918`, false dla pustego scope oraz false dla `today = 20260926`; nie czytaj zegara systemowego.",
        solution: advisoryRecallSolution,
        tests: advisoryRecallTests,
        kind: "recall",
      }),
    ],
    misconceptions: [
      "Ignore bez expiry jest stałą zgodą.",
      "Systemowa data zwiększa wiarygodność testu.",
      "Numer advisory sam zawiera decyzję o wyjątku.",
    ],
    transferTask:
      "Dodaj wpis exception ledger z ownerem, zakresem package, reason, datą review i expiry; opisz plan usunięcia wyjątku.",
    evidenceGate:
      "Dwie bramki wymagają porównania daty przekazanej argumentem i odrzucenia wygasłego wyjątku, także w świeżym blanku.",
    sourceIds: ["rustsec-advisory-database", "cargo-deny-reference"],
  },
  {
    id: "dependency-release-dossier",
    moduleId: dependencyAssuranceModule.id,
    conceptIds: ["dependency-release-dossier"],
    competencyIds: ["decide-release-from-evidence"],
    prerequisites: ["dependency-advisory-exceptions"],
    title: "Release wymaga dossier",
    subtitle:
      "Zwiążesz decyzję z manifestem, lockfile, audytem, archiwum i external consumerem.",
    minutes: 29,
    outcomes: [
      "Wymienisz artefakty po ich identyfikatorach.",
      "Zatrzymasz release dla pustego lub brakującego dowodu.",
      "Zachowasz publish=false w lokalnym fixture.",
    ],
    steps: [
      choice(
        "dependency-release-dossier-predict",
        "Przewidź decyzję",
        "Dossier ma zielony audyt, lecz brakuje hashy archiwum. Czy można wydać?",
        [
          "Nie, brak artefaktu oznacza Hold",
          "Tak, bo audit zastępuje archive",
          "Tak, jeśli publish=false",
        ],
        0,
        [
          "Dossier musi wskazać konkretny artefakt.",
          "Audyt i archive odpowiadają na różne pytania.",
          "publish=false ogranicza publikację, ale nie tworzy dowodu.",
        ],
      ),
      explain(
        "dependency-release-dossier-explain",
        "Granica artefaktu",
        "Po co osobny external consumer po ekstrakcji crate?",
        [
          "Aby sprawdzić publiczną granicę z perspektywy klienta",
          "Aby zastąpić test biblioteki",
          "Aby wygenerować nowy lockfile bez śladu",
        ],
        0,
        [
          "Konsument wykrywa problemy niewidoczne w prywatnych testach crate.",
          "To uzupełnienie, nie zamiennik.",
          "Lockfile powinien pozostać przypięty i porównany.",
        ],
      ),
      testsStep({
        id: "dependency-release-dossier-gate",
        title: "Podejmij decyzję z dossier",
        prompt:
          "Zaimplementuj `decide(&Dossier)`: Release tylko dla niepustych manifest/lock/audit/artifact/config, `consumer == true` i `publish == false`; inaczej Hold.",
        code: dossierStarter,
        solution: dossierSolution,
        tests: dossierTests,
        evidenceGate: true,
      }),
      testsStep({
        id: "dependency-release-dossier-blank",
        title: "Od pustej kartki: release decision",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq)] struct ReleaseDossier<'a> { manifest: &'a str, lockfile: &'a str, policy: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }`, `#[derive(Debug, PartialEq, Eq)] enum Decision { Release, Hold }` oraz `fn evaluate(dossier: &ReleaseDossier<'_>) -> Decision`. Zwróć `Release` tylko dla niepustych pięciu pól tekstowych, `consumer == true` i `publish == false`; pusty policy oraz `consumer == false` muszą dawać `Hold`.",
        solution: dossierBlankSolution,
        tests: dossierBlankTests,
        evidenceGate: true,
        kind: "blank",
      }),
      testsStep({
        id: "dependency-release-dossier-recall",
        title: "Powtórka: kompletność",
        prompt:
          "Zaimplementuj `#[derive(Debug, PartialEq, Eq)] struct EvidenceBundle<'a> { artifact: &'a str, config: &'a str, consumer: bool, missing_evidence: bool, publish: bool }`, `#[derive(Debug, PartialEq, Eq)] enum Status { Ready, Hold }` oraz `fn release_status(bundle: &EvidenceBundle<'_>) -> Status`. Kompletne `artifact = \"zip-sha\"`, `config = \"deny.toml\"`, `consumer = true`, `missing_evidence = false`, `publish = false` daje `Ready`; brak artifactu albo `missing_evidence = true` daje `Hold`.",
        solution: dossierRecallSolution,
        tests: dossierRecallTests,
        kind: "recall",
      }),
    ],
    misconceptions: [
      "Zielony cargo check dowodzi kompletnego release.",
      "publish=false zastępuje external consumer.",
      "Pusty hash jest wystarczającym placeholderem.",
    ],
    transferTask:
      "Zbuduj release dossier z nazwą pliku, hashem, datą oceny i ownerem; oddziel obserwację od decyzji oraz zapisz powód Hold.",
    evidenceGate:
      "Dwie bramki wymagają fail-closed decyzji z pięciu dowodów i niezależnego blanku, który odrzuca pusty artefakt lub publish=true.",
    sourceIds: ["cargo-package-dossier-reference", "cargo-deny-reference"],
  },
];

export const dependencyAssuranceReviewExercises: Record<string, LessonStep> = {
  "dependency-graph-diagnosis": testsStep({
    id: "dependency-graph-diagnosis-review",
    title: "Powtórka: konflikt source",
    prompt:
      "Zaimplementuj `#[derive(Debug, PartialEq, Eq)] struct Dependency { name: &'static str, version: &'static str, source: &'static str, feature: &'static str }`, `#[derive(Debug, PartialEq, Eq)] enum Review { Pass, Hold(&'static str) }` oraz `fn review_graph(dependencies: &[Dependency]) -> Review`. Dwa wpisy `ring` z wersjami 0.17/0.16 i source registry/git mają dać `Hold(\"ring\")`; pojedynczy wpis ma dać `Pass`.",
    solution: graphReviewSolution,
    tests: graphReviewTests,
    kind: "recall",
  }),
  "dependency-source-license-policy": testsStep({
    id: "dependency-source-license-policy-review",
    title: "Powtórka: jawna licencja",
    prompt:
      'Zaimplementuj `#[derive(Debug, PartialEq, Eq)] enum PolicyResult { Allowed, Denied }` oraz `fn approve(origin: &str, license: &str) -> PolicyResult`. `("registry", "MIT")` ma dać `Allowed`, a `("path", "MIT")` i `("registry", "GPL-3.0")` mają dać `Denied`; nie twórz domyślnej zgody.',
    solution: policyReviewSolution,
    tests: policyReviewTests,
    kind: "recall",
  }),
  "dependency-advisory-exceptions": testsStep({
    id: "dependency-advisory-exceptions-review",
    title: "Powtórka: expiry",
    prompt:
      "Zaimplementuj `#[derive(Debug, PartialEq, Eq)] struct ExceptionRecord { advisory: &'static str, package: &'static str, owner: &'static str, reason: &'static str, expires_ymd: u32 }` oraz `fn within_window(record: &ExceptionRecord, as_of_ymd: u32) -> bool`. Wymagaj niepustych advisory/package/owner/reason oraz `expires_ymd >= as_of_ymd`; pusty advisory, pusty reason i data `20261016` dla expiry `20261015` muszą dać false.",
    solution: advisoryReviewSolution,
    tests: advisoryReviewTests,
    kind: "recall",
  }),
  "dependency-release-dossier": testsStep({
    id: "dependency-release-dossier-review",
    title: "Powtórka: Hold",
    prompt:
      "Zaimplementuj `#[derive(Debug, PartialEq, Eq)] struct ReleaseProof<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, artifact: &'a str, config: &'a str, consumer: bool, publish: bool }`, `#[derive(Debug, PartialEq, Eq)] enum Outcome { Ship, Stop }` oraz `fn release(proof: &ReleaseProof<'_>) -> Outcome`. Kompletne dowody z `consumer = true` i `publish = false` dają `Ship`; pusty lock albo `publish = true` daje `Stop`.",
    solution: dossierReviewSolution,
    tests: dossierReviewTests,
    kind: "recall",
  }),
};

export { dependencyAssuranceModule };
