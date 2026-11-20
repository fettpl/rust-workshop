import type { LessonStep } from "../domain/types";

function transfer(
  id: string,
  conceptId: string,
  title: string,
  prompt: string,
  solution: string,
  tests: string,
): LessonStep {
  return {
    id,
    kind: "blank",
    title,
    prompt,
    solution,
    evaluator: { kind: "tests", tests },
    hints: [
      "Zapisz stan zmieniany między kolejnymi elementami i warunki, które muszą pozostać niezależne.",
      "Sprawdź pustą sekwencję, granice oraz sytuację, w której wcześniejszy element wpływa na późniejszy wynik.",
    ],
    evidenceKind: "assessment",
    evidenceGate: true,
    evidence: {
      version: 1,
      conceptIds: [conceptId],
      codingTaskId: `service-operations/${id}-v1`,
    },
  };
}

const admissionSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
struct Request { source: &'static str, proof: bool, cost: u32 }
#[derive(Debug, PartialEq, Eq)]
enum Decision { Accepted, Untrusted, Proof, Budget, Full }
fn admit_batch(requests: &[Request], allowlist: &[&str], require_proof: bool, max_cost: u32, mut active: usize, limit: usize) -> Vec<Decision> {
    requests.iter().map(|request| {
        if !allowlist.contains(&request.source) { Decision::Untrusted }
        else if require_proof && !request.proof { Decision::Proof }
        else if request.cost > max_cost { Decision::Budget }
        else if active >= limit { Decision::Full }
        else { active += 1; Decision::Accepted }
    }).collect()
}`;
const admissionTests = String.raw`#[test]
fn authorizes_each_request_before_spending_a_shared_slot() {
    let requests = [
        Request { source: "other", proof: false, cost: 9 },
        Request { source: "edge", proof: false, cost: 9 },
        Request { source: "edge", proof: true, cost: 9 },
        Request { source: "edge", proof: true, cost: 4 },
        Request { source: "worker", proof: true, cost: 0 },
        Request { source: "edge", proof: true, cost: 1 },
    ];
    assert_eq!(admit_batch(&requests, &["edge", "worker"], true, 4, 1, 3), vec![Decision::Untrusted, Decision::Proof, Decision::Budget, Decision::Accepted, Decision::Accepted, Decision::Full]);
    assert_eq!(admit_batch(&requests, &["edge", "worker"], true, 4, 3, 3), vec![Decision::Untrusted, Decision::Proof, Decision::Budget, Decision::Full, Decision::Full, Decision::Full]);
}
#[test]
fn handles_optional_proof_zero_capacity_and_extreme_occupancy() {
    let requests = [Request { source: "edge", proof: false, cost: 0 }, Request { source: "edge", proof: false, cost: 0 }];
    assert_eq!(admit_batch(&requests, &["edge", "edge"], false, 0, 0, 1), vec![Decision::Accepted, Decision::Full]);
    assert_eq!(admit_batch(&requests, &[], false, 0, 0, 2), vec![Decision::Untrusted, Decision::Untrusted]);
    for (active, limit) in [(0, 0), (3, 2), (usize::MAX, usize::MAX)] {
        assert_eq!(admit_batch(&requests, &["edge"], false, 0, active, limit), vec![Decision::Full, Decision::Full]);
    }
    assert!(admit_batch(&[], &["edge"], true, 4, 0, 2).is_empty());
}`;
export const admissionBatchTransfer = transfer(
  "trust-admission-batch-transfer",
  "service-operations-bounded-admission",
  "Rozlicz wspólną pojemność partii żądań",
  "Napisz od zera `#[derive(Debug, PartialEq, Eq)] struct Request { source: &'static str, proof: bool, cost: u32 }`, `#[derive(Debug, PartialEq, Eq)] enum Decision { Accepted, Untrusted, Proof, Budget, Full }` oraz `fn admit_batch(requests: &[Request], allowlist: &[&str], require_proof: bool, max_cost: u32, active: usize, limit: usize) -> Vec<Decision>`. Zwróć jedną decyzję na każde żądanie w kolejności wejścia. Dla każdego żądania sprawdzaj kolejno: źródło poza allowlistą -> Untrusted, brak wymaganego proof -> Proof, cost > max_cost -> Budget, zajętość active >= limit -> Full; inaczej Accepted. Koszt równy max_cost jest poprawny. Tylko Accepted zużywa jeden wspólny slot, więc wpływa na następne żądania; odrzucenia nie zmieniają zajętości. Proof jest opcjonalny przy require_proof == false. Pusta allowlista odrzuca wszystkie źródła; jej duplikaty nie tworzą slotów. Obsłuż active > limit, limit 0 i usize::MAX bez przepełnienia. Pusta partia daje pusty wynik.",
  admissionSolution,
  admissionTests,
);

const telemetrySolution = String.raw`#[derive(Debug, PartialEq, Eq)]
struct Event { source: &'static str, correlation_id: u64, kind: &'static str }
#[derive(Debug, PartialEq, Eq)]
struct Report { correlation_id: u64, kinds: Vec<&'static str>, count: usize }
fn telemetry_reports(events: &[Event], allowlist: &[&str], ids: &[u64]) -> Vec<Report> {
    ids.iter().map(|id| {
        let kinds: Vec<_> = events.iter().filter(|event| allowlist.contains(&event.source) && event.correlation_id == *id).map(|event| event.kind).collect();
        Report { correlation_id: *id, count: kinds.len(), kinds }
    }).collect()
}`;
const telemetryTests = String.raw`#[test]
fn reports_each_requested_id_without_crossing_source_or_correlation_boundaries() {
    let events = [
        Event { source: "edge", correlation_id: 7, kind: "żółć" },
        Event { source: "secret", correlation_id: 7, kind: "hidden" },
        Event { source: "worker", correlation_id: 8, kind: "other" },
        Event { source: "worker", correlation_id: 7, kind: "finish" },
        Event { source: "edge", correlation_id: 7, kind: "żółć" },
        Event { source: "edge", correlation_id: 0, kind: "zero" },
        Event { source: "edge", correlation_id: 7, kind: "last" },
    ];
    assert_eq!(telemetry_reports(&events, &["edge", "worker", "edge"], &[8, 7, 99, 7, 0]), vec![
        Report { correlation_id: 8, kinds: vec!["other"], count: 1 },
        Report { correlation_id: 7, kinds: vec!["żółć", "finish", "żółć", "last"], count: 4 },
        Report { correlation_id: 99, kinds: vec![], count: 0 },
        Report { correlation_id: 7, kinds: vec!["żółć", "finish", "żółć", "last"], count: 4 },
        Report { correlation_id: 0, kinds: vec!["zero"], count: 1 },
    ]);
    assert_eq!(telemetry_reports(&events, &["worker"], &[7]), vec![Report { correlation_id: 7, kinds: vec!["finish"], count: 1 }]);
    assert_eq!(telemetry_reports(&events, &[], &[7]), vec![Report { correlation_id: 7, kinds: vec![], count: 0 }]);
    assert!(telemetry_reports(&events, &["edge"], &[]).is_empty());
    assert_eq!(telemetry_reports(&[], &["edge"], &[u64::MAX]), vec![Report { correlation_id: u64::MAX, kinds: vec![], count: 0 }]);
}`;
export const telemetryReportsTransfer = transfer(
  "telemetry-correlation-reports-transfer",
  "service-operations-allowlisted-telemetry",
  "Zbuduj oddzielny raport dla każdego incydentu",
  "Zdefiniuj `#[derive(Debug, PartialEq, Eq)] struct Event { source: &'static str, correlation_id: u64, kind: &'static str }`, `#[derive(Debug, PartialEq, Eq)] struct Report { correlation_id: u64, kinds: Vec<&'static str>, count: usize }` oraz `fn telemetry_reports(events: &[Event], allowlist: &[&str], ids: &[u64]) -> Vec<Report>`. Zwróć po jednym raporcie dla każdej pozycji ids, w tej samej kolejności, również dla powtórzonego lub nieobecnego ID. W każdym raporcie kinds zawiera wyłącznie zdarzenia o tym ID i źródle z allowlisty, w kolejności wejścia, z duplikatami i niezmienionymi kind. count liczy dokładnie te dozwolone skorelowane zdarzenia. Duplikaty allowlisty nie powielają zdarzeń. Brak pasujących zdarzeń albo pusta allowlista daje pusty kinds i count 0; puste ids daje pusty wynik. ID 0 i u64::MAX są zwykłymi identyfikatorami.",
  telemetrySolution,
  telemetryTests,
);

const lifecycleSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Phase { Starting, Ready, Draining, Stopped }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
struct State { phase: Phase, accepted: usize, completed: usize }
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Command { Boot, Submit, Finish, Close }
#[derive(Debug, PartialEq, Eq)]
struct Snapshot { state: State, ready: bool, drained: bool }
fn replay(mut state: State, commands: &[Command]) -> Vec<Snapshot> {
    let snapshot = |state: State| Snapshot { state, ready: state.phase == Phase::Ready, drained: matches!(state.phase, Phase::Draining | Phase::Stopped) && state.accepted == state.completed };
    let mut timeline = vec![snapshot(state)];
    for command in commands {
        match command {
            Command::Boot if state.phase == Phase::Starting => state.phase = Phase::Ready,
            Command::Submit if state.phase == Phase::Ready => state.accepted += 1,
            Command::Finish if state.completed < state.accepted => state.completed += 1,
            Command::Close if state.phase == Phase::Ready => state.phase = Phase::Draining,
            _ => {},
        }
        if state.phase == Phase::Draining && state.accepted == state.completed { state.phase = Phase::Stopped; }
        timeline.push(snapshot(state));
    }
    timeline
}`;
const lifecycleTests = String.raw`#[test]
fn replays_each_command_and_preserves_accounting_through_shutdown() {
    let start = State { phase: Phase::Starting, accepted: 0, completed: 0 };
    let result = replay(start, &[Command::Submit, Command::Close, Command::Finish, Command::Boot, Command::Submit, Command::Submit, Command::Close, Command::Boot, Command::Submit, Command::Finish, Command::Finish, Command::Finish, Command::Submit]);
    let expected = [
        (Phase::Starting, 0, 0, false, false), (Phase::Starting, 0, 0, false, false),
        (Phase::Starting, 0, 0, false, false), (Phase::Starting, 0, 0, false, false),
        (Phase::Ready, 0, 0, true, false), (Phase::Ready, 1, 0, true, false),
        (Phase::Ready, 2, 0, true, false), (Phase::Draining, 2, 0, false, false),
        (Phase::Draining, 2, 0, false, false), (Phase::Draining, 2, 0, false, false),
        (Phase::Draining, 2, 1, false, false), (Phase::Stopped, 2, 2, false, true),
        (Phase::Stopped, 2, 2, false, true), (Phase::Stopped, 2, 2, false, true),
    ];
    assert_eq!(result.len(), expected.len());
    for (actual, (phase, accepted, completed, ready, drained)) in result.iter().zip(expected) {
        assert_eq!(actual, &Snapshot { state: State { phase, accepted, completed }, ready, drained });
    }
}
#[test]
fn readiness_and_drain_are_distinct_even_when_counts_are_equal() {
    for phase in [Phase::Starting, Phase::Ready, Phase::Draining, Phase::Stopped] {
        for (accepted, completed) in [(0, 0), (3, 3), (3, 2)] {
            let state = State { phase, accepted, completed };
            assert_eq!(replay(state, &[]), vec![Snapshot { state, ready: phase == Phase::Ready, drained: matches!(phase, Phase::Draining | Phase::Stopped) && accepted == completed }]);
        }
    }
    let ready = State { phase: Phase::Ready, accepted: 1, completed: 1 };
    assert_eq!(replay(ready, &[Command::Close, Command::Boot, Command::Submit]).last().unwrap(), &Snapshot { state: State { phase: Phase::Stopped, accepted: 1, completed: 1 }, ready: false, drained: true });
    let active = replay(State { phase: Phase::Ready, accepted: 2, completed: 1 }, &[Command::Finish]);
    assert_eq!(active.last().unwrap(), &Snapshot { state: State { phase: Phase::Ready, accepted: 2, completed: 2 }, ready: true, drained: false });
}`;
const lifecycleReplay = transfer(
  "readiness-drain-replay-transfer",
  "service-operations-readiness-drain",
  "Odtwórz pełną oś readiness i drain",
  "Napisz typy z Debug, PartialEq, Eq, Clone i Copy: `enum Phase { Starting, Ready, Draining, Stopped }`, `struct State { phase: Phase, accepted: usize, completed: usize }`, `enum Command { Boot, Submit, Finish, Close }`. Dodaj `#[derive(Debug, PartialEq, Eq)] struct Snapshot { state: State, ready: bool, drained: bool }` i `fn replay(state: State, commands: &[Command]) -> Vec<Snapshot>`. Wynik zawiera najpierw niezmieniony stan początkowy, a potem jeden snapshot po każdym poleceniu (również ignorowanym). Boot zmienia tylko Starting na Ready. Submit zwiększa accepted tylko w Ready. Finish zwiększa completed tylko poniżej accepted. Close zmienia tylko Ready na Draining. Po każdym poleceniu Draining z równymi licznikami staje się Stopped; nie normalizuj początkowego snapshotu przed pierwszym poleceniem. ready jest true dokładnie w Ready; drained wymaga Draining lub Stopped i accepted == completed. Żadna inna faza nie oznacza zakończenia. Kolejne Boot ani Submit nie otwierają drainu lub Stopped. Dane wejściowe mają completed <= accepted, a accepted + commands.len() mieści się w usize. Puste commands zwraca dokładnie snapshot wejściowy.",
  lifecycleSolution,
  lifecycleTests,
);

// The replay solution demonstrates both state transitions and the two accounting predicates.
export const lifecycleReplayTransfer: LessonStep = {
  ...lifecycleReplay,
  suppliedSolutions: {
    solution: [
      "readiness-drain-gate",
      "readiness-drain-blank",
      "readiness-drain-accounting-gate",
      "readiness-drain-recall",
    ].map((stepId) => ({ lessonId: "service-readiness-drain", stepId })),
  },
};

const ledgerSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Event { Accept(u32), Finish(u32), Close }
#[derive(Debug, PartialEq, Eq)]
enum Status { Ready(usize), Draining(usize), Stopped }
fn audit_jobs(events: &[Event]) -> Vec<Status> {
    use std::collections::HashSet;
    let mut admitted = HashSet::<u32>::new();
    let mut pending = HashSet::new();
    let mut open = true;
    let mut result = Vec::new();
    for event in events {
        match *event {
            Event::Accept(id) if open && admitted.insert(id) => { pending.insert(id); }
            Event::Finish(id) => { pending.remove(&id); }
            Event::Close => open = false,
            _ => {}
        }
        result.push(match (open, pending.len()) {
            (true, count) => Status::Ready(count),
            (false, 0) => Status::Stopped,
            (false, count) => Status::Draining(count),
        });
    }
    result
}`;
const ledgerTests = String.raw`#[test]
fn readiness_tracks_admitted_identities_and_close_waits_for_every_one() {
    use Event::*;
    use Status::*;
    assert_eq!(audit_jobs(&[]), vec![]);
    assert_eq!(audit_jobs(&[Close, Accept(0), Finish(0), Close]), vec![Stopped, Stopped, Stopped, Stopped]);
    let input = [Finish(3), Accept(3), Accept(7), Accept(3), Close, Accept(9), Finish(9), Finish(3), Finish(3), Close, Finish(7), Accept(3)];
    assert_eq!(audit_jobs(&input), vec![Ready(0),Ready(1),Ready(2),Ready(2),Draining(2),Draining(2),Draining(2),Draining(1),Draining(1),Draining(1),Stopped,Stopped]);
}
#[test]
fn finished_ids_cannot_be_admitted_again_while_open() {
    use Event::*;
    use Status::*;
    assert_eq!(audit_jobs(&[Accept(0), Finish(0), Accept(0), Accept(u32::MAX), Close, Finish(u32::MAX)]),
        vec![Ready(1),Ready(0),Ready(0),Ready(1),Draining(1),Stopped]);
}`;

export const jobLedgerTransfer = transfer(
  "readiness-job-ledger-transfer",
  "service-operations-readiness-drain",
  "Rozlicz zamknięcie usługi według identyfikatorów",
  "Zdefiniuj enum Event { Accept(u32), Finish(u32), Close }, porównywalny enum Status { Ready(usize), Draining(usize), Stopped } z Debug oraz fn audit_jobs(events: &[Event]) -> Vec<Status>. Usługa początkowo przyjmuje pracę. Przyjmij każdy identyfikator najwyżej raz w całej historii, także po zakończeniu zadania. Finish rozlicza tylko przyjęte i wciąż otwarte zadanie o tym ID. Close trwale zamyka przyjęcia. Po każdym zdarzeniu, również zignorowanym, zapisz stan. Ready(n) oznacza otwarte przyjęcia i n nierozliczonych zadań. Po zamknięciu raportuj Draining(n) do ostatniego zakończenia, potem Stopped. Puste wejście daje pusty raport.",
  ledgerSolution,
  ledgerTests,
);

const incidentSolution = String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Signal { Ready(bool), Accepted(usize), Completed(usize), Telemetry(usize), Reset }
#[derive(Debug, PartialEq, Eq)]
enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }
#[derive(Debug, PartialEq, Eq)]
struct IncidentReport { complete: bool, diagnosis: Diagnosis }
fn incident_timeline(signals: &[Signal]) -> Vec<IncidentReport> {
    let (mut ready, mut accepted, mut completed, mut telemetry) = (None, None, None, None);
    signals.iter().map(|signal| {
        match *signal {
            Signal::Ready(value) => ready = Some(value),
            Signal::Accepted(value) => accepted = Some(value),
            Signal::Completed(value) => completed = Some(value),
            Signal::Telemetry(value) => telemetry = Some(value),
            Signal::Reset => { ready = None; accepted = None; completed = None; telemetry = None; },
        }
        let complete = ready.is_some() && accepted.is_some() && completed.is_some() && telemetry.is_some();
        let diagnosis = match (ready, accepted, completed, telemetry) {
            (Some(r), Some(a), Some(c), Some(t)) => {
                if !r { Diagnosis::AdmissionBlocked }
                else if c < a { Diagnosis::WorkStuck }
                else if t == 0 { Diagnosis::TelemetryGap }
                else { Diagnosis::Healthy }
            },
            _ => Diagnosis::InsufficientEvidence,
        };
        IncidentReport { complete, diagnosis }
    }).collect()
}`;
const incidentTests = String.raw`#[test]
fn each_missing_signal_remains_inconclusive_even_with_fault_signals() {
    let signals = [Signal::Ready(false), Signal::Accepted(5), Signal::Completed(1), Signal::Telemetry(0)];
    for missing in 0..4 {
        let partial: Vec<_> = signals.iter().enumerate().filter(|(i, _)| *i != missing).map(|(_, signal)| *signal).collect();
        let reports = incident_timeline(&partial);
        assert_eq!(reports.len(), 3);
        assert!(reports.iter().all(|report| *report == IncidentReport { complete: false, diagnosis: Diagnosis::InsufficientEvidence }));
    }
    assert!(incident_timeline(&[]).is_empty());
}
#[test]
fn updates_replace_old_observations_and_preserve_diagnosis_priority() {
    let reports = incident_timeline(&[Signal::Telemetry(0), Signal::Completed(1), Signal::Accepted(3), Signal::Ready(false), Signal::Ready(true), Signal::Completed(3), Signal::Telemetry(8), Signal::Accepted(4), Signal::Ready(false)]);
    assert_eq!(reports.into_iter().map(|report| (report.complete, report.diagnosis)).collect::<Vec<_>>(), vec![
        (false, Diagnosis::InsufficientEvidence), (false, Diagnosis::InsufficientEvidence), (false, Diagnosis::InsufficientEvidence),
        (true, Diagnosis::AdmissionBlocked), (true, Diagnosis::WorkStuck), (true, Diagnosis::TelemetryGap),
        (true, Diagnosis::Healthy), (true, Diagnosis::WorkStuck), (true, Diagnosis::AdmissionBlocked),
    ]);
}
#[test]
fn reset_requires_four_fresh_signals_and_zero_is_present_evidence() {
    let reports = incident_timeline(&[Signal::Ready(true), Signal::Accepted(0), Signal::Completed(0), Signal::Telemetry(0), Signal::Reset, Signal::Telemetry(2), Signal::Ready(true), Signal::Completed(0), Signal::Accepted(0)]);
    assert_eq!(reports[3], IncidentReport { complete: true, diagnosis: Diagnosis::TelemetryGap });
    for report in &reports[4..8] { assert_eq!(*report, IncidentReport { complete: false, diagnosis: Diagnosis::InsufficientEvidence }); }
    assert_eq!(reports[8], IncidentReport { complete: true, diagnosis: Diagnosis::Healthy });
    let overcomplete = incident_timeline(&[Signal::Ready(true), Signal::Accepted(0), Signal::Completed(usize::MAX), Signal::Telemetry(usize::MAX)]);
    assert_eq!(overcomplete.last().unwrap(), &IncidentReport { complete: true, diagnosis: Diagnosis::Healthy });
}`;
export const incidentTimelineTransfer = transfer(
  "incident-diagnosis-timeline-transfer",
  "service-operations-incident-evidence",
  "Diagnozuj aktualizacje i reset dowodu",
  "Zdefiniuj `#[derive(Debug, PartialEq, Eq, Clone, Copy)] enum Signal { Ready(bool), Accepted(usize), Completed(usize), Telemetry(usize), Reset }`, `#[derive(Debug, PartialEq, Eq)] enum Diagnosis { Healthy, AdmissionBlocked, WorkStuck, TelemetryGap, InsufficientEvidence }`, `#[derive(Debug, PartialEq, Eq)] struct IncidentReport { complete: bool, diagnosis: Diagnosis }` i `fn incident_timeline(signals: &[Signal]) -> Vec<IncidentReport>`. Na początku wszystkie cztery obserwacje są nieobecne. Każdy sygnał zastępuje ostatnią wartość odpowiedniej obserwacji, Reset usuwa wszystkie cztery. Po każdym sygnale zwróć raport bieżącego dowodu; puste wejście daje pusty wynik. complete wymaga obecności wszystkich czterech obserwacji (false i 0 nadal są obecne). Przy jakimkolwiek braku diagnosis to InsufficientEvidence. Przy pełnych danych zachowaj priorytet: Ready(false) -> AdmissionBlocked; inaczej completed < accepted -> WorkStuck; inaczej Telemetry(0) -> TelemetryGap; inaczej Healthy. Równość oraz completed > accepted nie oznaczają WorkStuck w tym modelu. Po Reset żaden dawny sygnał nie może uzupełniać nowego incydentu.",
  incidentSolution,
  incidentTests,
);

export const serviceOperationsTransferControls = [
  {
    step: admissionBatchTransfer,
    equivalent: admissionSolution
      .replace(
        "requests.iter().map(|request| {",
        "let mut decisions = Vec::new();\n    for request in requests {\n        let decision = {",
      )
      .replace(
        "    }).collect()",
        "        };\n        decisions.push(decision);\n    }\n    decisions",
      ),
    mutants: [
      admissionSolution.replace(
        "!allowlist.contains(&request.source)",
        "false",
      ),
      admissionSolution.replace("require_proof && !request.proof", "false"),
      admissionSolution.replace(
        "request.cost > max_cost",
        "request.cost >= max_cost",
      ),
      admissionSolution.replace("active >= limit", "active > limit"),
      admissionSolution.replace("active += 1;", "active += 0;"),
    ],
  },
  {
    step: telemetryReportsTransfer,
    equivalent: telemetrySolution
      .replace(
        "ids.iter().map(|id| {",
        "let mut reports = Vec::new();\n    for id in ids {",
      )
      .replace(
        "        Report { correlation_id: *id, count: kinds.len(), kinds }",
        "        reports.push(Report { correlation_id: *id, count: kinds.len(), kinds });",
      )
      .replace("    }).collect()", "    }\n    reports"),
    mutants: [
      telemetrySolution.replace("allowlist.contains(&event.source) && ", ""),
      telemetrySolution.replace(" && event.correlation_id == *id", ""),
      telemetrySolution.replace("count: kinds.len()", "count: events.len()"),
      telemetrySolution.replace(
        "kinds }",
        "kinds: kinds.into_iter().rev().collect() }",
      ),
    ],
  },
  {
    step: jobLedgerTransfer,
    equivalent: ledgerSolution.replace(/HashSet/g, "BTreeSet"),
    mutants: [
      ledgerSolution.replace(
        "open && admitted.insert(id)",
        "admitted.insert(id)",
      ),
      ledgerSolution.replace(
        "open && admitted.insert(id)",
        "open && !pending.contains(&id)",
      ),
      ledgerSolution.replace(
        "(false, count) => Status::Draining(count)",
        "(false, _) => Status::Stopped",
      ),
      ledgerSolution.replace(
        "pending.remove(&id);",
        "if let Some(any) = pending.iter().copied().min() { pending.remove(&any); }",
      ),
      ledgerSolution.replace(
        "(true, count) => Status::Ready(count)",
        "(true, 0) => Status::Stopped, (true, count) => Status::Ready(count)",
      ),
    ],
  },
  {
    step: lifecycleReplayTransfer,
    equivalent: lifecycleSolution.replace(
      "timeline.push(snapshot(state));",
      "timeline.extend(std::iter::once(snapshot(state)));",
    ),
    mutants: [
      lifecycleSolution.replace(
        "state.completed < state.accepted",
        "state.completed <= state.accepted",
      ),
      lifecycleSolution.replace(
        "Command::Submit if state.phase == Phase::Ready",
        "Command::Submit if state.phase != Phase::Stopped",
      ),
      lifecycleSolution.replace(
        "state.phase == Phase::Draining && state.accepted == state.completed",
        "state.phase == Phase::Draining",
      ),
      lifecycleSolution.replace(
        "ready: state.phase == Phase::Ready",
        "ready: state.phase != Phase::Stopped",
      ),
      lifecycleSolution.replace(
        "drained: matches!(state.phase, Phase::Draining | Phase::Stopped) && state.accepted == state.completed",
        "drained: state.accepted == state.completed",
      ),
      lifecycleSolution.replace(
        "Command::Boot if state.phase == Phase::Starting",
        "Command::Boot if state.phase != Phase::Ready",
      ),
    ],
  },
  {
    step: incidentTimelineTransfer,
    equivalent: incidentSolution.replace(
      "let complete = ready.is_some() && accepted.is_some() && completed.is_some() && telemetry.is_some();",
      "let complete = matches!((ready, accepted, completed, telemetry), (Some(_), Some(_), Some(_), Some(_)));",
    ),
    mutants: [
      incidentSolution.replace(
        "_ => Diagnosis::InsufficientEvidence",
        "_ => Diagnosis::Healthy",
      ),
      incidentSolution.replace("else if c < a", "else if c <= a"),
      ...["ready", "accepted", "completed", "telemetry"].map((field) =>
        incidentSolution.replace(
          "let complete = ready.is_some() && accepted.is_some() && completed.is_some() && telemetry.is_some();",
          `let complete = [${["ready", "accepted", "completed", "telemetry"]
            .filter((candidate) => candidate !== field)
            .map((candidate) => `${candidate}.is_some()`)
            .join(", ")}].into_iter().all(|present| present);`,
        ),
      ),
      incidentSolution.replace(
        "if !r { Diagnosis::AdmissionBlocked }\n                else if c < a { Diagnosis::WorkStuck }",
        "if c < a { Diagnosis::WorkStuck }\n                else if !r { Diagnosis::AdmissionBlocked }",
      ),
      incidentSolution.replace(
        "Signal::Reset => { ready = None; accepted = None; completed = None; telemetry = None; }",
        "Signal::Reset => {}",
      ),
      incidentSolution
        .replace(
          "Signal::Telemetry(value) => telemetry = Some(value)",
          "Signal::Telemetry(value) if telemetry.is_none() => telemetry = Some(value)",
        )
        .replace(
          "Signal::Reset =>",
          "Signal::Telemetry(_) => {},\n            Signal::Reset =>",
        ),
    ],
  },
];
