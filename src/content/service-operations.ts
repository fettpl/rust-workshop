import {
  admissionBatchTransfer,
  telemetryReportsTransfer,
  lifecycleReplayTransfer,
  jobLedgerTransfer,
  incidentTimelineTransfer,
  serviceOperationsTransferControls,
} from "./service-operations-transfer";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

const reviewedAt = "2026-09-18";
const moduleId = "service-operations";

export const serviceOperationsSources: Source[] = [
  {
    id: "service-operations-collections",
    title: "Rust standard library: collections",
    url: "https://doc.rust-lang.org/std/collections/index.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów filtrowania allowlisty lub grupowania identyfikatorów korelacji.",
  },
  {
    id: "service-operations-enums",
    title: "Rust standard library: enum and match",
    url: "https://doc.rust-lang.org/book/ch06-00-enums.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie modelu faz usługi, zdarzeń przejścia lub diagnoz domenowych.",
  },
  {
    id: "service-operations-std-slice",
    title: "Rust standard library: slice methods",
    url: "https://doc.rust-lang.org/std/primitive.slice.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu wejścia, kolejności obserwacji lub testów granicznych.",
  },
  {
    id: "service-operations-testing",
    title: "Rust Book: writing automated tests",
    url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie niezależnych przypadków testowych albo polityki dowodu.",
  },
];

export const serviceOperationsCompetencies: Competency[] = [
  {
    id: "service-operations-trust-boundary",
    title:
      "Rozdzielasz zaufanie, proof i limit admission, zanim zaakceptujesz pracę.",
  },
  {
    id: "service-operations-correlated-telemetry",
    title:
      "Przepuszczasz telemetryczne zdarzenia przez allowlistę i zachowujesz ich korelację.",
  },
  {
    id: "service-operations-lifecycle-accounting",
    title:
      "Prowadzisz jawne rozliczenie accepted/completed i przeprowadzasz readiness oraz drain przez fazy.",
  },
  {
    id: "service-operations-evidence-diagnosis",
    title:
      "Formułujesz diagnozę wyłącznie z wystarczających dowodów i sygnalizujesz brak danych.",
  },
];

export const serviceOperationsConcepts: Concept[] = [
  {
    id: "service-operations-bounded-admission",
    title: "Granica zaufania i bounded admission",
    prerequisites: ["tokio-admission-permit-lifetime"],
    competencyIds: ["service-operations-trust-boundary"],
    reviewPrompt:
      "Co musi sprawdzić `admit`, zanim uzna żądanie za przyjęte do bounded service?",
    reviewAnswer:
      "Najpierw sprawdza, czy źródło jest zaufane, potem wymagany proof, a następnie jawny koszt mieści się w limicie polityki. Każdy brak warunku zwraca odrzucenie z rozróżnialnym powodem; równość z limitem jest dozwolona.",
    distinguish:
      "Zaufanie i limit pojemności to dwa niezależne warunki. Samo sprawdzenie kosztu nie autoryzuje źródła, a sama allowlista źródeł nie ogranicza liczby przyjętych jednostek.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "service-operations-allowlisted-telemetry",
    title: "Allowlista i korelacja telemetryczna",
    prerequisites: ["service-operations-bounded-admission"],
    competencyIds: ["service-operations-correlated-telemetry"],
    reviewPrompt:
      "Jak wybrać zdarzenia telemetryczne dla jednego incydentu bez wpuszczania nieautoryzowanego źródła?",
    reviewAnswer:
      "Zachowaj zdarzenie tylko wtedy, gdy jego źródło znajduje się na allowliście i `correlation_id` jest równe żądanemu identyfikatorowi. Filtr powinien zachować kolejność wejścia, duplikaty i pusty wynik.",
    distinguish:
      "Korelacja nie jest autoryzacją. Zdarzenie z właściwym identyfikatorem nadal trzeba odrzucić, jeśli jego źródło nie jest dozwolone; pojedynczy globalny licznik gubi granicę incydentu.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "service-operations-readiness-drain",
    title: "Accounting, readiness i drain jako maszyna stanów",
    prerequisites: ["service-operations-allowlisted-telemetry"],
    competencyIds: ["service-operations-lifecycle-accounting"],
    reviewPrompt:
      "Kiedy usługa może zakończyć drain i co musi pozostać rozliczone?",
    reviewAnswer:
      "Najpierw zamyka przyjmowanie nowych jednostek, a potem czeka, aż liczba `completed` zrówna się z liczbą `accepted`. Nie wolno uznać samego sygnału stopu albo pustki chwilowego odczytu za zakończenie; readiness i drain są jawne w fazie stanu.",
    distinguish:
      "Gotowość do przyjmowania ruchu nie oznacza gotowości do zakończenia. `accepted` jest zobowiązaniem do rozliczenia, a `completed` opisuje faktycznie zakończoną pracę.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "service-operations-incident-evidence",
    title: "Diagnoza incydentu z niewystarczającym dowodem",
    prerequisites: ["service-operations-readiness-drain"],
    competencyIds: ["service-operations-evidence-diagnosis"],
    reviewPrompt:
      "Dlaczego `diagnose` powinno zwrócić `InsufficientEvidence`, gdy brakuje jednego z wymaganych sygnałów?",
    reviewAnswer:
      "Diagnoza ma opierać się na obserwowalnym dowodzie, więc brak readiness, accounting albo telemetry uniemożliwia rozstrzygnięcie. `InsufficientEvidence` chroni przed zgłoszeniem konkretnej przyczyny na podstawie korelacji lub pojedynczego sygnału.",
    distinguish:
      "Brak danych nie jest dowodem zdrowia ani dowodem awarii. Stan `InsufficientEvidence` zachowuje granicę wniosku i wskazuje potrzebę uzupełnienia obserwacji.",
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
        explanations.map((value, index) => [String(index), value]),
      ),
    },
    evidenceKind: "prediction",
  };
}

function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function coding(options: {
  id: string;
  kind: "modify" | "apply" | "blank" | "recall";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: [
      "Zapisz najpierw warunki kontraktu i przypadki graniczne.",
      "Sprawdź osobno pustkę, równość limitu oraz brak dowodu; nie maskuj problemu stałą odpowiedzią.",
    ],
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "recall"
          ? "recall"
          : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const trustAdmissionSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Request { trusted: bool, proof: bool, cost: u32 }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Policy { max_cost: u32, require_proof: bool }

#[derive(Debug, PartialEq, Eq)]
enum Admission { Accepted, Rejected(&'static str) }

fn admit(request: Request, policy: Policy) -> Admission {
    if !request.trusted { Admission::Rejected("untrusted") }
    else if policy.require_proof && !request.proof { Admission::Rejected("proof") }
    else if request.cost > policy.max_cost { Admission::Rejected("budget") }
    else { Admission::Accepted }
}`;
const trustAdmissionStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Request { trusted: bool, proof: bool, cost: u32 }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Policy { max_cost: u32, require_proof: bool }

#[derive(Debug, PartialEq, Eq)]
enum Admission { Accepted, Rejected(&'static str) }

fn admit(request: Request, policy: Policy) -> Admission {
    let _ = (request, policy);
    todo!()
}`;

const trustAdmissionEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Request { trusted: bool, proof: bool, cost: u32 }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Policy { max_cost: u32, require_proof: bool }
#[derive(Debug, PartialEq, Eq)]
enum Admission { Accepted, Rejected(&'static str) }
fn admit(request: Request, policy: Policy) -> Admission {
    match (request.trusted, policy.require_proof && !request.proof, request.cost <= policy.max_cost) {
        (false, _, _) => Admission::Rejected("untrusted"),
        (true, true, _) => Admission::Rejected("proof"),
        (true, false, false) => Admission::Rejected("budget"),
        (true, false, true) => Admission::Accepted,
    }
}`;

const trustAdmissionMutant = trustAdmissionSolution.replace(
  "request.cost > policy.max_cost",
  "request.cost >= policy.max_cost",
);

const trustAdmissionTests = String.raw`#[test]
fn admit_requires_trust_proof_and_budget_in_order() {
    let policy = Policy { max_cost: 4, require_proof: true };
    assert_eq!(admit(Request { trusted: false, proof: true, cost: 1 }, policy), Admission::Rejected("untrusted"));
    assert_eq!(admit(Request { trusted: true, proof: false, cost: 1 }, policy), Admission::Rejected("proof"));
    assert_eq!(admit(Request { trusted: true, proof: true, cost: 5 }, policy), Admission::Rejected("budget"));
    assert_eq!(admit(Request { trusted: true, proof: true, cost: 4 }, policy), Admission::Accepted);
    assert_eq!(admit(Request { trusted: true, proof: true, cost: 1 }, Policy { max_cost: 4, require_proof: false }), Admission::Accepted);
    assert_eq!(admit(Request { trusted: true, proof: false, cost: 1 }, Policy { max_cost: 4, require_proof: false }), Admission::Accepted);
}`;

const admissionSlotSolution = String.raw`fn can_admit(active: usize, limit: usize, trusted: bool) -> bool {
    trusted && active < limit
}`;
const admissionSlotStarter = String.raw`fn can_admit(active: usize, limit: usize, trusted: bool) -> bool {
    let _ = (active, limit, trusted);
    todo!()
}`;
const admissionSlotEquivalent = String.raw`fn can_admit(active: usize, limit: usize, trusted: bool) -> bool {
    if !trusted { return false; }
    limit.checked_sub(active).is_some_and(|remaining| remaining > 0)
}`;
const admissionSlotMutant = String.raw`fn can_admit(active: usize, limit: usize, trusted: bool) -> bool {
    trusted && active <= limit
}`;
const admissionSlotTests = String.raw`#[test]
fn admission_slot_is_bounded_and_trusted() {
    assert!(can_admit(0, 1, true));
    assert!(can_admit(3, 4, true));
    assert!(!can_admit(4, 4, true));
    assert!(!can_admit(0, 4, false));
}`;

const telemetrySelectSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }

fn select_telemetry<'a>(events: &'a [Event], allowlist: &[&str], correlation_id: u64) -> Vec<&'a Event> {
    events.iter().filter(|event| allowlist.contains(&event.source) && event.correlation_id == correlation_id).collect()
}`;
const telemetrySelectStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }

fn select_telemetry<'a>(events: &'a [Event], allowlist: &[&str], correlation_id: u64) -> Vec<&'a Event> {
    let _ = (events, allowlist, correlation_id);
    todo!()
}`;
const telemetrySelectEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }
fn select_telemetry<'a>(events: &'a [Event], allowlist: &[&str], correlation_id: u64) -> Vec<&'a Event> {
    events.iter().filter_map(|event| (event.correlation_id == correlation_id).then_some(event)).filter(|event| allowlist.iter().any(|source| *source == event.source)).collect()
}`;
const telemetrySelectMutant = telemetrySelectSolution.replace(
  "allowlist.contains(&event.source) && event.correlation_id == correlation_id",
  "allowlist.contains(&event.source) || event.correlation_id == correlation_id",
);
const telemetrySelectTests = String.raw`#[test]
fn telemetry_selection_requires_allowlist_and_correlation() {
    let events = [
        Event { source: "edge", correlation_id: 7, kind: "start" },
        Event { source: "secret", correlation_id: 7, kind: "secret" },
        Event { source: "edge", correlation_id: 8, kind: "other" },
        Event { source: "edge", correlation_id: 7, kind: "start" },
        Event { source: "edge", correlation_id: 7, kind: "finish" },
    ];
    let selected = select_telemetry(&events, &["edge"], 7);
    assert_eq!(selected.iter().map(|event| event.kind).collect::<Vec<_>>(), vec!["start", "start", "finish"]);
    assert_eq!(selected[0].source, "edge");
    assert!(select_telemetry(&events, &[], 7).is_empty());
}`;

const telemetryCountSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }

fn count_correlated(events: &[Event], allowlist: &[&str], correlation_id: u64) -> usize {
    events.iter().filter(|event| allowlist.contains(&event.source) && event.correlation_id == correlation_id).count()
}`;
const telemetryCountStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }

fn count_correlated(events: &[Event], allowlist: &[&str], correlation_id: u64) -> usize {
    let _ = (events, allowlist, correlation_id);
    todo!()
}`;
const telemetryCountEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }
fn count_correlated(events: &[Event], allowlist: &[&str], correlation_id: u64) -> usize {
    events.iter().filter_map(|event| (allowlist.contains(&event.source) && event.correlation_id == correlation_id).then_some(())).count()
}`;
const telemetryCountMutant = telemetryCountSolution.replace(
  "allowlist.contains(&event.source) && event.correlation_id == correlation_id",
  "event.correlation_id == correlation_id",
);
const telemetryCountTests = String.raw`#[test]
fn telemetry_count_excludes_other_sources_and_ids() {
    let events = [
        Event { source: "edge", correlation_id: 3, kind: "a" },
        Event { source: "edge", correlation_id: 3, kind: "b" },
        Event { source: "worker", correlation_id: 3, kind: "c" },
        Event { source: "edge", correlation_id: 4, kind: "d" },
    ];
    assert_eq!(count_correlated(&events, &["edge"], 3), 2);
    assert_eq!(count_correlated(&events, &["worker"], 3), 1);
    assert_eq!(count_correlated(&events, &["edge"], 9), 0);
}`;

const stateApplySolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Event { MarkReady, Accept, Complete, BeginDrain }

fn apply(mut state: ServiceState, event: Event) -> ServiceState {
    match event {
        Event::MarkReady if state.phase == Phase::Starting => state.phase = Phase::Ready,
        Event::Accept if state.phase == Phase::Ready => state.accepted += 1,
        Event::Complete if state.completed < state.accepted => state.completed += 1,
        Event::BeginDrain if state.phase == Phase::Ready => state.phase = Phase::Draining,
        _ => {}
    }
    if state.phase == Phase::Draining && state.accepted == state.completed { state.phase = Phase::Stopped; }
    state
}`;
const stateApplyStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Event { MarkReady, Accept, Complete, BeginDrain }

fn apply(state: ServiceState, event: Event) -> ServiceState {
    let _ = (state, event);
    todo!()
}`;
const stateApplyEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Event { MarkReady, Accept, Complete, BeginDrain }
fn apply(mut state: ServiceState, event: Event) -> ServiceState {
    if matches!((state.phase, event), (Phase::Starting, Event::MarkReady)) { state.phase = Phase::Ready; }
    else if matches!((state.phase, event), (Phase::Ready, Event::Accept)) { state.accepted += 1; }
    else if matches!(event, Event::Complete) && state.completed < state.accepted { state.completed += 1; }
    else if matches!((state.phase, event), (Phase::Ready, Event::BeginDrain)) { state.phase = Phase::Draining; }
    if matches!(state.phase, Phase::Draining) && state.accepted == state.completed { state.phase = Phase::Stopped; }
    state
}`;
const stateApplyMutant = stateApplySolution.replace(
  "state.completed < state.accepted",
  "state.completed <= state.accepted",
);
const stateApplyTests = String.raw`#[test]
fn state_accounts_work_and_stops_only_after_drain() {
    let start = ServiceState { phase: Phase::Starting, accepted: 0, completed: 0 };
    let ready = apply(start, Event::MarkReady);
    assert_eq!(ready.phase, Phase::Ready);
    let busy = apply(apply(ready, Event::Accept), Event::Accept);
    assert_eq!((busy.accepted, busy.completed), (2, 0));
    assert_eq!(apply(start, Event::Accept), start);
    let draining = apply(busy, Event::BeginDrain);
    assert_eq!(draining.phase, Phase::Draining);
    assert_eq!(apply(draining, Event::Accept), draining);
    let done = apply(apply(draining, Event::Complete), Event::Complete);
    assert_eq!(done, ServiceState { phase: Phase::Stopped, accepted: 2, completed: 2 });
    assert_eq!(apply(done, Event::Accept), done);
    assert_eq!(apply(done, Event::Complete), done);
}`;

const readinessSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }
fn ready_for_traffic(state: &ServiceState) -> bool { state.phase == Phase::Ready }
fn drain_complete(state: &ServiceState) -> bool { matches!(state.phase, Phase::Draining | Phase::Stopped) && state.accepted == state.completed }`;
const readinessStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }

fn ready_for_traffic(state: &ServiceState) -> bool {
    let _ = state;
    todo!()
}

fn drain_complete(state: &ServiceState) -> bool {
    let _ = state;
    todo!()
}`;
const readinessEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct ServiceState { phase: Phase, accepted: usize, completed: usize }
fn ready_for_traffic(state: &ServiceState) -> bool { matches!(state.phase, Phase::Ready) }
fn drain_complete(state: &ServiceState) -> bool { (state.phase == Phase::Draining || state.phase == Phase::Stopped) && state.accepted.checked_sub(state.completed) == Some(0) }`;
const readinessMutant = readinessSolution.replace(
  "state.accepted == state.completed",
  "state.accepted >= state.completed",
);
const readinessTests = String.raw`#[test]
fn readiness_and_drain_are_distinct_contracts() {
    let ready = ServiceState { phase: Phase::Ready, accepted: 3, completed: 1 };
    let draining = ServiceState { phase: Phase::Draining, accepted: 3, completed: 1 };
    let done = ServiceState { phase: Phase::Stopped, accepted: 3, completed: 3 };
    assert!(ready_for_traffic(&ready));
    assert!(!ready_for_traffic(&draining));
    assert!(!drain_complete(&draining));
    assert!(drain_complete(&done));
    assert!(!drain_complete(&ServiceState { phase: Phase::Ready, accepted: 3, completed: 3 }));
}`;

const diagnosisSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }
fn diagnose(evidence: Evidence) -> Diagnosis {
    if evidence.readiness.is_none() || evidence.accepted.is_none() || evidence.completed.is_none() || evidence.telemetry_events.is_none() { return Diagnosis::InsufficientEvidence; }
    if evidence.readiness == Some(false) { Diagnosis::AdmissionBlocked }
    else if evidence.completed.unwrap() < evidence.accepted.unwrap() { Diagnosis::WorkStuck }
    else if evidence.telemetry_events == Some(0) { Diagnosis::TelemetryGap }
    else { Diagnosis::Healthy }
}`;
const diagnosisStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }

fn diagnose(evidence: Evidence) -> Diagnosis {
    let _ = evidence;
    todo!()
}`;
const diagnosisEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }
fn diagnose(evidence: Evidence) -> Diagnosis {
    match (evidence.readiness, evidence.accepted, evidence.completed, evidence.telemetry_events) {
        (Some(readiness), Some(accepted), Some(completed), Some(telemetry)) => {
            if !readiness { Diagnosis::AdmissionBlocked } else if completed < accepted { Diagnosis::WorkStuck } else if telemetry == 0 { Diagnosis::TelemetryGap } else { Diagnosis::Healthy }
        }
        _ => Diagnosis::InsufficientEvidence,
    }
}`;
const diagnosisMutant = diagnosisSolution.replace(
  "evidence.readiness.is_none() || evidence.accepted.is_none() || evidence.completed.is_none() || evidence.telemetry_events.is_none()",
  "evidence.readiness.is_none() || evidence.accepted.is_none() || evidence.completed.is_none()",
);
const diagnosisTests = String.raw`#[test]
fn diagnosis_requires_all_signals_and_preserves_priority() {
    let healthy = Evidence { readiness: Some(true), accepted: Some(2), completed: Some(2), telemetry_events: Some(4) };
    let blocked = Evidence { readiness: Some(false), accepted: Some(2), completed: Some(2), telemetry_events: Some(4) };
    let stuck = Evidence { readiness: Some(true), accepted: Some(3), completed: Some(2), telemetry_events: Some(4) };
    let gap = Evidence { readiness: Some(true), accepted: Some(2), completed: Some(2), telemetry_events: Some(0) };
    assert_eq!(diagnose(healthy), Diagnosis::Healthy);
    assert_eq!(diagnose(blocked), Diagnosis::AdmissionBlocked);
    assert_eq!(diagnose(stuck), Diagnosis::WorkStuck);
    assert_eq!(diagnose(gap), Diagnosis::TelemetryGap);
    assert_eq!(diagnose(Evidence { readiness: None, accepted: Some(2), completed: Some(2), telemetry_events: Some(4) }), Diagnosis::InsufficientEvidence);
    assert_eq!(diagnose(Evidence { readiness: Some(true), accepted: None, completed: Some(2), telemetry_events: Some(4) }), Diagnosis::InsufficientEvidence);
    assert_eq!(diagnose(Evidence { readiness: Some(true), accepted: Some(2), completed: None, telemetry_events: Some(4) }), Diagnosis::InsufficientEvidence);
    assert_eq!(diagnose(Evidence { readiness: Some(true), accepted: Some(2), completed: Some(2), telemetry_events: None }), Diagnosis::InsufficientEvidence);
    assert_eq!(diagnose(Evidence { readiness: Some(false), accepted: Some(3), completed: Some(1), telemetry_events: Some(0) }), Diagnosis::AdmissionBlocked);
    assert_eq!(diagnose(Evidence { readiness: Some(true), accepted: Some(3), completed: Some(1), telemetry_events: Some(0) }), Diagnosis::WorkStuck);
}`;

const evidenceDecisionSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }
fn enough_evidence(evidence: &Evidence) -> bool {
    evidence.readiness.is_some() && evidence.accepted.is_some() && evidence.completed.is_some() && evidence.telemetry_events.is_some()
}`;
const evidenceDecisionStarter = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }

fn enough_evidence(evidence: &Evidence) -> bool {
    let _ = evidence;
    todo!()
}`;
const evidenceDecisionEquivalent = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }
fn enough_evidence(evidence: &Evidence) -> bool {
    [evidence.readiness.is_some(), evidence.accepted.is_some(), evidence.completed.is_some(), evidence.telemetry_events.is_some()].into_iter().all(|present| present)
}`;
const evidenceDecisionMutant = evidenceDecisionSolution.replace(
  "evidence.readiness.is_some() && evidence.accepted.is_some() && evidence.completed.is_some() && evidence.telemetry_events.is_some()",
  "evidence.readiness.is_some() && evidence.accepted.is_some() && evidence.completed.is_some()",
);
const evidenceDecisionTests = String.raw`#[test]
fn evidence_decision_rejects_each_missing_signal() {
    let full = Evidence { readiness: Some(true), accepted: Some(1), completed: Some(1), telemetry_events: Some(1) };
    assert!(enough_evidence(&full));
    assert!(!enough_evidence(&Evidence { readiness: None, ..full }));
    assert!(!enough_evidence(&Evidence { accepted: None, ..full }));
    assert!(!enough_evidence(&Evidence { completed: None, ..full }));
    assert!(!enough_evidence(&Evidence { telemetry_events: None, ..full }));
}`;

const incidentReviewSolution = diagnosisSolution
  .replace(
    "fn diagnose(evidence: Evidence) -> Diagnosis",
    "fn diagnose_incident(evidence: Evidence) -> Diagnosis",
  )
  .replace("diagnose(evidence)", "diagnose_incident(evidence)");
const incidentReviewEquivalent = diagnosisEquivalent.replace(
  "fn diagnose(evidence: Evidence) -> Diagnosis",
  "fn diagnose_incident(evidence: Evidence) -> Diagnosis",
);
const incidentReviewMutant = incidentReviewSolution.replace(
  "evidence.telemetry_events.is_none()",
  "false",
);
const incidentReviewTests = diagnosisTests.replace(
  /diagnose\(/g,
  "diagnose_incident(",
);

export const serviceOperationsAssessmentSources: Record<
  string,
  { equivalent: string; mutant: string }
> = {
  ...Object.fromEntries(
    serviceOperationsTransferControls.map(({ step, equivalent, mutants }) => [
      step.id,
      { equivalent, mutant: mutants[0] },
    ]),
  ),
  "trust-admission-gate": {
    equivalent: trustAdmissionEquivalent,
    mutant: trustAdmissionMutant,
  },
  "trust-admission-budget-gate": {
    equivalent: admissionSlotEquivalent,
    mutant: admissionSlotMutant,
  },
  "trust-admission-blank": {
    equivalent: trustAdmissionEquivalent,
    mutant: trustAdmissionMutant,
  },
  "trust-admission-recall": {
    equivalent: admissionSlotEquivalent,
    mutant: admissionSlotMutant,
  },
  "telemetry-correlation-gate": {
    equivalent: telemetrySelectEquivalent,
    mutant: telemetrySelectMutant,
  },
  "telemetry-correlation-allowlist-gate": {
    equivalent: telemetryCountEquivalent,
    mutant: telemetryCountMutant,
  },
  "telemetry-correlation-blank": {
    equivalent: telemetrySelectEquivalent,
    mutant: telemetrySelectMutant,
  },
  "telemetry-correlation-recall": {
    equivalent: telemetryCountEquivalent,
    mutant: telemetryCountMutant,
  },
  "readiness-drain-gate": {
    equivalent: stateApplyEquivalent,
    mutant: stateApplyMutant,
  },
  "readiness-drain-accounting-gate": {
    equivalent: readinessEquivalent,
    mutant: readinessMutant,
  },
  "readiness-drain-blank": {
    equivalent: stateApplyEquivalent,
    mutant: stateApplyMutant,
  },
  "readiness-drain-recall": {
    equivalent: readinessEquivalent,
    mutant: readinessMutant,
  },
  "incident-diagnosis-gate": {
    equivalent: diagnosisEquivalent,
    mutant: diagnosisMutant,
  },
  "incident-diagnosis-evidence-gate": {
    equivalent: evidenceDecisionEquivalent,
    mutant: evidenceDecisionMutant,
  },
  "incident-diagnosis-blank": {
    equivalent: diagnosisEquivalent,
    mutant: diagnosisMutant,
  },
  "incident-diagnosis-recall": {
    equivalent: evidenceDecisionEquivalent,
    mutant: evidenceDecisionMutant,
  },
  "review-service-operations-bounded-admission": {
    equivalent: trustAdmissionEquivalent,
    mutant: trustAdmissionMutant,
  },
  "review-service-operations-allowlisted-telemetry": {
    equivalent: telemetrySelectEquivalent,
    mutant: telemetrySelectMutant,
  },
  "review-service-operations-readiness-drain": {
    equivalent: stateApplyEquivalent,
    mutant: stateApplyMutant,
  },
  "review-service-operations-incident-evidence": {
    equivalent: incidentReviewEquivalent,
    mutant: incidentReviewMutant,
  },
};

export const serviceOperationsLessons: Lesson[] = [
  {
    id: "service-trust-admission",
    moduleId,
    conceptIds: ["service-operations-bounded-admission"],
    competencyIds: ["service-operations-trust-boundary"],
    prerequisites: ["tokio-admission-lifecycle"],
    title: "Zamknij granicę zaufania przed admission",
    subtitle:
      "Rozdzielisz autoryzację źródła od bounded capacity i nazwiesz każdy powód odrzucenia.",
    minutes: 28,
    outcomes: [
      "Sprawdzisz zaufanie, proof i koszt w jawnej kolejności.",
      "Zachowasz równość limitu jako poprawny przypadek admission.",
      "Odróżnisz brak autoryzacji od braku miejsca w usłudze.",
    ],
    steps: [
      choice(
        "trust-admission-predict",
        "Najpierw granica",
        "Który warunek powinien poprzedzać zwiększenie licznika przyjętej pracy?",
        [
          "Zaufanie źródła i wymagany proof",
          "Losowy backoff",
          "Sama liczba aktywnych zadań",
        ],
        0,
        [
          "Admission nie może przyjąć nieautoryzowanej pracy.",
          "Backoff nie jest dowodem autoryzacji.",
          "Limit nie zastępuje granicy zaufania.",
        ],
      ),
      run(
        "trust-admission-run",
        "Zobacz wynik polityki",
        "Równość z limitem jest dozwolona, a zaufanie pozostaje osobnym warunkiem.",
        `fn admit(trusted: bool, cost: u32, max_cost: u32) -> &'static str { if trusted && cost <= max_cost { "accepted" } else { "rejected" } }
fn main() { println!("{}", admit(true, 4, 4)); }`,
        "accepted\n",
      ),
      coding({
        id: "trust-admission-gate",
        kind: "modify",
        title: "Zaimplementuj bounded admission",
        prompt:
          "Uzupełnij `admit(request: Request, policy: Policy) -> Admission`. Odrzuć niezaufane źródło, brak wymaganego proof albo koszt większy od limitu; równość limitu przyjmij.",
        code: trustAdmissionStarter,
        solution: trustAdmissionSolution,
        tests: trustAdmissionTests,
        gate: true,
      }),
      coding({
        id: "trust-admission-budget-gate",
        kind: "apply",
        title: "Nie przekrocz slotu",
        prompt:
          "Zaimplementuj `can_admit(active: usize, limit: usize, trusted: bool) -> bool`. Zwróć true tylko dla zaufanego źródła i `active < limit`.",
        code: admissionSlotStarter,
        solution: admissionSlotSolution,
        tests: admissionSlotTests,
        gate: true,
      }),
      coding({
        id: "trust-admission-blank",
        kind: "blank",
        title: "Blank page: polityka admission",
        prompt:
          'Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Request { trusted: bool, proof: bool, cost: u32 }`, `#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Policy { max_cost: u32, require_proof: bool }` oraz `#[derive(Debug, PartialEq, Eq)] enum Admission { Accepted, Rejected(&\'static str) }`. Zaimplementuj dokładnie `fn admit(request: Request, policy: Policy) -> Admission`: odrzucaj z literalem `"untrusted"`, `"proof"` albo `"budget"`, a przyjmuj koszt równy limitowi; proof jest wymagany tylko przy `require_proof == true`.',
        solution: trustAdmissionSolution,
        tests: trustAdmissionTests,
      }),
      coding({
        id: "trust-admission-recall",
        kind: "recall",
        title: "Retrieval: bounded slot",
        prompt:
          "Odtwórz `fn can_admit(active: usize, limit: usize, trusted: bool) -> bool` bez podglądania rozwiązania. Przypadek `active == limit` ma odrzucać, a niezaufane źródło nie może wykorzystać wolnego slotu.",
        code: admissionSlotStarter,
        solution: admissionSlotSolution,
        tests: admissionSlotTests,
      }),
      admissionBatchTransfer,
    ],
    misconceptions: [
      "Limit pojemności sam w sobie jest autoryzacją.",
      "Równość limitu oznacza przekroczenie.",
      "Proof można sprawdzać po przyjęciu pracy.",
    ],
    transferTask:
      "Zaprojektuj tabelę decyzji dla żądania z trzema źródłami zaufania i dwoma limitami kosztu.",
    evidenceGate:
      "Dwie bramki sprawdzają niezależnie autoryzację oraz bounded slot; blank wymaga odtworzenia pełnej polityki.",
    sourceIds: ["service-operations-collections", "service-operations-testing"],
  },
  {
    id: "service-correlated-telemetry",
    moduleId,
    conceptIds: ["service-operations-allowlisted-telemetry"],
    competencyIds: ["service-operations-correlated-telemetry"],
    prerequisites: ["service-trust-admission"],
    title: "Przepuść tylko skorelowaną telemetrykę",
    subtitle:
      "Allowlista źródeł i correlation ID ograniczą dowód do zdarzeń, którym można ufać.",
    minutes: 28,
    outcomes: [
      "Odfiltrujesz źródło przed interpretacją korelacji.",
      "Zachowasz kolejność i duplikaty zdarzeń.",
      "Rozpoznasz pustą allowlistę jako brak dowodu.",
    ],
    steps: [
      choice(
        "telemetry-correlation-predict",
        "Korelacja nie autoryzuje",
        "Które zdarzenie wolno dołączyć do raportu incydentu?",
        [
          "Źródło na allowliście i właściwy correlation_id",
          "Każde zdarzenie z właściwym correlation_id",
          "Pierwsze zdarzenie niezależnie od źródła",
        ],
        0,
        [
          "Oba warunki ograniczają dowód.",
          "Korelacja bez zaufanego źródła może być obca.",
          "Pozycja w strumieniu nie jest autoryzacją.",
        ],
      ),
      run(
        "telemetry-correlation-run",
        "Zobacz filtrowanie",
        "Dwa zdarzenia z tym samym identyfikatorem pochodzą z różnych źródeł.",
        `fn selected(events: &[(&str, u64)], allow: &[&str], id: u64) -> usize { events.iter().filter(|(source, event_id)| allow.contains(source) && *event_id == id).count() }
fn main() { println!("{}", selected(&[("edge", 7), ("secret", 7), ("edge", 8)], &["edge"], 7)); }`,
        "1\n",
      ),
      coding({
        id: "telemetry-correlation-gate",
        kind: "modify",
        title: "Wybierz skorelowane zdarzenia",
        prompt:
          "Uzupełnij `select_telemetry`. Zwróć w kolejności tylko zdarzenia, których `source` jest na allowliście i których `correlation_id` równa się żądanemu ID. Zachowaj duplikaty.",
        code: telemetrySelectStarter,
        solution: telemetrySelectSolution,
        tests: telemetrySelectTests,
        gate: true,
      }),
      coding({
        id: "telemetry-correlation-allowlist-gate",
        kind: "apply",
        title: "Policz bez utraty granicy",
        prompt:
          "Zaimplementuj `count_correlated(events, allowlist, correlation_id) -> usize`. Licz wyłącznie dozwolone źródła z tym samym ID; pusty wynik ma być równy zero.",
        code: telemetryCountStarter,
        solution: telemetryCountSolution,
        tests: telemetryCountTests,
        gate: true,
      }),
      coding({
        id: "telemetry-correlation-blank",
        kind: "blank",
        title: "Blank page: allowlisted telemetry",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Event { source: &'static str, correlation_id: u64, kind: &'static str }` oraz dokładnie `fn select_telemetry<'a>(events: &'a [Event], allowlist: &[&str], correlation_id: u64) -> Vec<&'a Event>`. Zwróć w kolejności tylko zdarzenia z dozwolonym `source` i równym `correlation_id`; zachowaj `kind`, duplikaty i lifetime pożyczonych elementów.",
        solution: telemetrySelectSolution,
        tests: telemetrySelectTests,
      }),
      coding({
        id: "telemetry-correlation-recall",
        kind: "recall",
        title: "Retrieval: policz korelację",
        prompt:
          "Odtwórz `fn count_correlated(events: &[Event], allowlist: &[&str], correlation_id: u64) -> usize`. Nie używaj globalnego licznika ani nie przepuszczaj zdarzeń spoza allowlisty.",
        code: telemetryCountStarter,
        solution: telemetryCountSolution,
        tests: telemetryCountTests,
      }),
      telemetryReportsTransfer,
    ],
    misconceptions: [
      "Właściwy correlation ID wystarcza.",
      "Kolejność można sortować bez zmiany kontraktu.",
      "Pusta allowlista może oznaczać wszystkie źródła.",
    ],
    transferTask:
      "Zaproponuj schemat raportu, który pokazuje correlation ID, dozwolone źródło i liczbę odrzuconych zdarzeń.",
    evidenceGate:
      "Bramki wymagają jednocześnie allowlisty i korelacji; blank sprawdza lifetime pożyczonych zdarzeń.",
    sourceIds: [
      "service-operations-collections",
      "service-operations-std-slice",
    ],
  },
  {
    id: "service-readiness-drain",
    moduleId,
    conceptIds: ["service-operations-readiness-drain"],
    competencyIds: ["service-operations-lifecycle-accounting"],
    prerequisites: ["service-correlated-telemetry"],
    title: "Rozlicz readiness i drain",
    subtitle:
      "Jawne fazy oraz liczniki pokażą, kiedy usługa może przestać przyjmować i kiedy naprawdę skończyła.",
    minutes: 30,
    outcomes: [
      "Przeprowadzisz fazy Starting, Ready, Draining i Stopped.",
      "Nie zwiększysz completed ponad accepted.",
      "Zakończysz drain dopiero po rozliczeniu zaakceptowanej pracy.",
    ],
    steps: [
      choice(
        "readiness-drain-predict",
        "Stop to początek drain",
        "Co musi wydarzyć się przed uznaniem usługi za zatrzymaną?",
        [
          "Zamknięcie admission i completed == accepted",
          "Sam sygnał stop",
          "Pierwszy pusty odczyt kolejki",
        ],
        0,
        [
          "To łączy granicę nowych przyjęć z rozliczeniem zobowiązań.",
          "Sygnał nie dowodzi ukończenia pracy.",
          "Pustka chwilowa nie rozlicza już przyjętej pracy.",
        ],
      ),
      run(
        "readiness-drain-run",
        "Obserwuj fazy",
        "Stan przechodzi do drain, ale kończy się dopiero po zrównaniu liczników.",
        `fn drain_complete(phase: &str, accepted: usize, completed: usize) -> bool { (phase == "draining" || phase == "stopped") && accepted == completed }
fn main() { println!("{} {}", drain_complete("draining", 2, 1), drain_complete("stopped", 2, 2)); }`,
        "false true\n",
      ),
      coding({
        id: "readiness-drain-gate",
        kind: "modify",
        title: "Zastosuj zdarzenie do stanu",
        prompt:
          "Uzupełnij `fn apply(state: ServiceState, event: Event) -> ServiceState`. Ready przyjmuje pracę, BeginDrain zamyka admission, Complete rozlicza tylko wcześniej accepted, a Draining z równymi licznikami przechodzi do Stopped.",
        code: stateApplyStarter,
        solution: stateApplySolution,
        tests: stateApplyTests,
        gate: true,
      }),
      coding({
        id: "readiness-drain-accounting-gate",
        kind: "apply",
        title: "Rozdziel readiness od zakończenia",
        prompt:
          "Zaimplementuj `ready_for_traffic` oraz `drain_complete`. Ready może przyjmować ruch; drain wymaga fazy Draining lub Stopped i `accepted == completed`.",
        code: readinessStarter,
        solution: readinessSolution,
        tests: readinessTests,
        gate: true,
      }),
      coding({
        id: "readiness-drain-blank",
        kind: "blank",
        title: "Blank page: maszyna stanów usługi",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq, Clone, Copy)] enum Phase { Starting, Ready, Draining, Stopped }`, `#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct ServiceState { phase: Phase, accepted: usize, completed: usize }` oraz `#[derive(Debug, PartialEq, Eq, Clone, Copy)] enum Event { MarkReady, Accept, Complete, BeginDrain }`. Zaimplementuj dokładnie `fn apply(state: ServiceState, event: Event) -> ServiceState`: `Accept` działa wyłącznie w `Ready`, `BeginDrain` zamyka admission, `Complete` nie przekracza `accepted`, a `Draining` przechodzi do `Stopped` tylko przy `accepted == completed`.",
        solution: stateApplySolution,
        tests: stateApplyTests,
      }),
      coding({
        id: "readiness-drain-recall",
        kind: "recall",
        title: "Retrieval: sprawdź zakończenie",
        prompt:
          "Odtwórz `ready_for_traffic` i `drain_complete` dla `ServiceState`. Zwróć false dla Ready z równymi licznikami, bo readiness nie jest drainem.",
        code: readinessStarter,
        solution: readinessSolution,
        tests: readinessTests,
      }),
      lifecycleReplayTransfer,
      jobLedgerTransfer,
    ],
    misconceptions: [
      "Ready oznacza, że można już kończyć proces.",
      "completed może wyprzedzić accepted.",
      "Zamknięcie admission usuwa wcześniejsze zobowiązania.",
    ],
    transferTask:
      "Narysuj tabelę przejść dla sygnału stopu otrzymanego przed i po przyjęciu dwóch jednostek pracy.",
    evidenceGate:
      "Bramki sprawdzają przejścia i accounting osobno; blank wymaga kompletnej maszyny stanów.",
    sourceIds: ["service-operations-enums", "service-operations-testing"],
  },
  {
    id: "service-incident-diagnosis",
    moduleId,
    conceptIds: ["service-operations-incident-evidence"],
    competencyIds: ["service-operations-evidence-diagnosis"],
    prerequisites: ["service-readiness-drain"],
    title: "Diagnozuj incydent według dowodu",
    subtitle:
      "Nazwiesz przyczynę tylko wtedy, gdy readiness, accounting i telemetryka tworzą wystarczający obraz.",
    minutes: 30,
    outcomes: [
      "Rozróżnisz blocked admission, stuck work, telemetry gap i healthy.",
      "Zwrócisz InsufficientEvidence dla każdego brakującego sygnału.",
      "Utrzymasz określoną kolejność diagnozy przy kilku sygnałach.",
    ],
    steps: [
      choice(
        "incident-diagnosis-predict",
        "Brak danych to osobny wynik",
        "Co należy zwrócić, gdy brakuje telemetry_events, ale pozostałe pola wyglądają zdrowo?",
        ["InsufficientEvidence", "Healthy", "WorkStuck"],
        0,
        [
          "Bez kompletnego dowodu nie wolno udawać pewnej diagnozy.",
          "Brak sygnału nie dowodzi zdrowia.",
          "Nie ma dowodu na zalegającą pracę.",
        ],
      ),
      run(
        "incident-diagnosis-run",
        "Zobacz priorytet dowodu",
        "Najpierw sprawdzana jest kompletność danych, potem readiness, accounting i telemetry gap.",
        `fn label(readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry: Option<usize>) -> &'static str { if readiness.is_none() || accepted.is_none() || completed.is_none() || telemetry.is_none() { "insufficient" } else if readiness == Some(false) { "blocked" } else { "observed" } }
fn main() { println!("{}", label(Some(true), Some(1), Some(1), None)); }`,
        "insufficient\n",
      ),
      coding({
        id: "incident-diagnosis-gate",
        kind: "modify",
        title: "Zdiagnozuj tylko pełny dowód",
        prompt:
          "Uzupełnij `fn diagnose(evidence: Evidence) -> Diagnosis`. Każde None ma dać `InsufficientEvidence`; przy pełnych danych zachowaj kolejność: blocked readiness, stuck accounting, telemetry gap, healthy.",
        code: diagnosisStarter,
        solution: diagnosisSolution,
        tests: diagnosisTests,
        gate: true,
      }),
      coding({
        id: "incident-diagnosis-evidence-gate",
        kind: "apply",
        title: "Sprawdź kompletność dowodu",
        prompt:
          "Zaimplementuj `fn enough_evidence(evidence: &Evidence) -> bool`. Wynik true wymaga obecności readiness, accepted, completed oraz telemetry_events; każdy brak ma dać false.",
        code: evidenceDecisionStarter,
        solution: evidenceDecisionSolution,
        tests: evidenceDecisionTests,
        gate: true,
      }),
      coding({
        id: "incident-diagnosis-blank",
        kind: "blank",
        title: "Blank page: diagnoza incydentu",
        prompt:
          "Od pustej kartki zdefiniuj `#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Evidence { readiness: Option<bool>, accepted: Option<usize>, completed: Option<usize>, telemetry_events: Option<usize> }` oraz `#[derive(Debug, PartialEq, Eq, Clone, Copy)] enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }`. Zaimplementuj dokładnie `fn diagnose(evidence: Evidence) -> Diagnosis`: każde `None` zwraca `Diagnosis::InsufficientEvidence`, a dla pełnych danych zachowaj kolejność `AdmissionBlocked`, `WorkStuck`, `TelemetryGap`, `Healthy`.",
        solution: diagnosisSolution,
        tests: diagnosisTests,
      }),
      coding({
        id: "incident-diagnosis-recall",
        kind: "recall",
        title: "Retrieval: kompletność sygnałów",
        prompt:
          "Odtwórz `fn enough_evidence(evidence: &Evidence) -> bool` i sprawdź cztery niezależne przypadki braku danych. Nie traktuj `None` jak zera.",
        code: evidenceDecisionStarter,
        solution: evidenceDecisionSolution,
        tests: evidenceDecisionTests,
      }),
      incidentTimelineTransfer,
    ],
    misconceptions: [
      "Brak telemetryki oznacza zdrowie.",
      "Najgłośniejszy sygnał zawsze wystarcza.",
      "None można zastąpić zerem i kontynuować diagnozę.",
    ],
    transferTask:
      "Ułóż runbook dla przypadku, w którym readiness jest false, ale accounting i telemetryka są niepełne.",
    evidenceGate:
      "Bramki sprawdzają diagnozę i kompletność osobno; blank wymaga jawnego przypadku InsufficientEvidence.",
    sourceIds: ["service-operations-enums", "service-operations-testing"],
  },
];

export const serviceOperationsReviewExercises: Record<string, LessonStep> = {
  "service-operations-bounded-admission": coding({
    id: "review-service-operations-bounded-admission",
    kind: "recall",
    title: "Powtórka: zaufanie przed limitem",
    prompt:
      "Zaprojektuj `admit` dla tej samej polityki bez kopiowania bramki: test musi pokazać niezaufane źródło, brak proof, koszt równy limitowi i koszt ponad limitem.",
    solution: trustAdmissionSolution,
    tests: trustAdmissionTests,
  }),
  "service-operations-allowlisted-telemetry": coding({
    id: "review-service-operations-allowlisted-telemetry",
    kind: "recall",
    title: "Powtórka: korelacja pod kontrolą",
    prompt:
      "Odtwórz funkcję wybierającą allowlisted telemetry dla correlation ID. Test musi ujawnić obce źródło z właściwym ID oraz zachować kolejność.",
    solution: telemetrySelectSolution,
    tests: telemetrySelectTests,
  }),
  "service-operations-readiness-drain": coding({
    id: "review-service-operations-readiness-drain",
    kind: "recall",
    title: "Powtórka: rozliczony drain",
    prompt:
      "Odtwórz `apply` dla faz i accounting. Zwróć stan Stopped dopiero po zamknięciu admission i rozliczeniu wszystkich accepted jednostek.",
    solution: stateApplySolution,
    tests: stateApplyTests,
  }),
  "service-operations-incident-evidence": coding({
    id: "review-service-operations-incident-evidence",
    kind: "recall",
    title: "Powtórka: nie zgaduj z braków",
    prompt:
      "Zaimplementuj `diagnose_incident` z wynikiem `InsufficientEvidence` dla brakującego sygnału i pierwszeństwem blocked/readiness przed pozostałymi przyczynami.",
    solution: incidentReviewSolution,
    tests: incidentReviewTests,
  }),
};

export const serviceOperationsModule: CourseModule = {
  id: moduleId,
  title: "Service Operations: zaufanie, telemetryka i incydenty",
  whyItMatters:
    "Operacyjny kontrakt zaczyna się przed pierwszym requestem: trzeba ograniczyć admission, dopuścić tylko skorelowany dowód, rozliczyć drain i nie udawać diagnozy, gdy brakuje sygnału.",
  capabilities: serviceOperationsCompetencies.map(
    (competency) => competency.title,
  ),
  prerequisites: ["tokio-network-service"],
  lessonIds: serviceOperationsLessons.map((lesson) => lesson.id),
  exitGate: [
    "Osiem niezależnych bramek sprawdza bounded trust/admission, allowlisted correlation, accounting/readiness/drain oraz diagnozę z przypadkami InsufficientEvidence.",
    "Osiem blank-page tasks i cztery retrievals używają deterministycznych, standardowych bibliotek Rust; cztery nowe zadania przenoszą kontrakty do partii żądań, raportów wielu incydentów i osi aktualizacji stanu. Rozwiązania są weryfikowane przez stałe testy i mutanty.",
  ],
  projectConnection:
    "Moduł przygotowuje decyzje do przyszłego bounded service i incident drill. Nie uruchamia projektu Cargo, kodu ucznia ani zewnętrznego systemu telemetrycznego. Zakładasz lokalny serwis sieciowy Tokio i jego cykl admission; możesz od razu przejść do zaufania, telemetryki i kontrolowanego drenu.",
  assessmentId: "incident-diagnosis-blank",
  gateCriteria: [
    {
      id: "trust-admission-gate-contract",
      label: "Zaufanie, proof i koszt są sprawdzane przed admission.",
      taskRefs: [
        { lessonId: "service-trust-admission", stepId: "trust-admission-gate" },
        {
          lessonId: "service-trust-admission",
          stepId: "trust-admission-blank",
        },
        {
          lessonId: "service-trust-admission",
          stepId: "trust-admission-batch-transfer",
        },
      ],
    },
    {
      id: "trust-admission-budget-gate-contract",
      label: "Bounded slot nie przekracza limitu i wymaga zaufanego źródła.",
      taskRefs: [
        {
          lessonId: "service-trust-admission",
          stepId: "trust-admission-budget-gate",
        },
        {
          lessonId: "service-trust-admission",
          stepId: "trust-admission-recall",
        },
        {
          lessonId: "service-trust-admission",
          stepId: "trust-admission-batch-transfer",
        },
      ],
    },
    {
      id: "telemetry-correlation-gate-contract",
      label: "Telemetryka przechodzi jednocześnie allowlistę i correlation ID.",
      taskRefs: [
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-gate",
        },
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-blank",
        },
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-reports-transfer",
        },
      ],
    },
    {
      id: "telemetry-correlation-allowlist-gate-contract",
      label: "Licznik telemetryki zachowuje granicę źródła i korelacji.",
      taskRefs: [
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-allowlist-gate",
        },
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-recall",
        },
        {
          lessonId: "service-correlated-telemetry",
          stepId: "telemetry-correlation-reports-transfer",
        },
      ],
    },
    {
      id: "readiness-drain-gate-contract",
      label: "Maszyna stanów rozlicza accepted i completed przed Stopped.",
      taskRefs: [
        { lessonId: "service-readiness-drain", stepId: "readiness-drain-gate" },
        {
          lessonId: "service-readiness-drain",
          stepId: "readiness-drain-blank",
        },
        {
          lessonId: "service-readiness-drain",
          stepId: "readiness-drain-replay-transfer",
        },
        { lessonId: "service-readiness-drain", stepId: jobLedgerTransfer.id },
      ],
    },
    {
      id: "readiness-drain-accounting-gate-contract",
      label: "Readiness i zakończenie drain pozostają różnymi kontraktami.",
      taskRefs: [
        {
          lessonId: "service-readiness-drain",
          stepId: "readiness-drain-accounting-gate",
        },
        {
          lessonId: "service-readiness-drain",
          stepId: "readiness-drain-recall",
        },
        {
          lessonId: "service-readiness-drain",
          stepId: "readiness-drain-replay-transfer",
        },
        { lessonId: "service-readiness-drain", stepId: jobLedgerTransfer.id },
      ],
    },
    {
      id: "incident-diagnosis-gate-contract",
      label:
        "Diagnoza wybiera przyczynę dopiero po sprawdzeniu kompletności dowodu.",
      taskRefs: [
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-gate",
        },
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-blank",
        },
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-timeline-transfer",
        },
      ],
    },
    {
      id: "incident-diagnosis-evidence-gate-contract",
      label: "Każdy brak sygnału daje InsufficientEvidence.",
      taskRefs: [
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-evidence-gate",
        },
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-recall",
        },
        {
          lessonId: "service-incident-diagnosis",
          stepId: "incident-diagnosis-timeline-transfer",
        },
      ],
    },
  ],
};
