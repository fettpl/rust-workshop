import { retryQueue, retryWindows, retryReplicas, retryLedger } from "./client-retry-transfer";
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

/** No new source records are introduced by A10; these are existing reviewed IDs. */
export const serviceClientRetrySourceIds = [
  "tokio-timeout",
  "tokio-tcp-stream",
  "errors-rust-book-overview",
] as const;
export const serviceClientRetrySources: Source[] = [];

export const serviceClientRetryCompetencies: Competency[] = [
  {
    id: "service-client-bounded-policy-competency",
    title: "Ograniczasz ponowienia wspólnym deadline, budżetem prób i sprawdzonym backoffem.",
  },
  {
    id: "service-client-ambiguity-competency",
    title: "Zachowujesz niepewność między próbami i potwierdzasz dostarczenie tylko prawidłowym receiptem.",
  },
];

export const serviceClientRetryConcepts: Concept[] = [
  {
    id: "service-client-retry-policy",
    title: "Polityka bounded retry",
    prerequisites: ["capstone-incident-recovery-contract"],
    competencyIds: ["service-client-bounded-policy-competency"],
    reviewPrompt: "Które zdarzenia mogą uruchomić bounded replay i co ogranicza każdą próbę?",
    reviewAnswer: "Ponawiaj tylko BUSY, QUEUE_FULL i niepewność transportu, zachowując ten sam frame, wspólny deadline, limit prób oraz dodatni backoff.",
    distinguish: "Deadline techniczny ogranicza działanie klienta; nie jest obietnicą czasu nauki ani dowodem sukcesu serwera.",
    evidenceArtifact: "rust-code",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
  },
  {
    id: "service-client-ambiguity-contract",
    title: "Niepewność agregowana między próbami",
    prerequisites: ["service-client-retry-policy"],
    competencyIds: ["service-client-ambiguity-competency"],
    reviewPrompt: "Co dzieje się z wynikiem po utracie odpowiedzi, a następnie terminalnej odmowie?",
    reviewAnswer: "Bez prawidłowego INSERTED albo DUPLICATE wcześniejsza niepewność pozostaje Unknown; późniejsza odmowa nie dowodzi rollbacku.",
    distinguish: "Receipt jest potwierdzeniem dostarczenia, a błąd lub brak odpowiedzi opisuje obserwację. Nie ma zmyślonego receipt query.",
    evidenceArtifact: "rust-code",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
  },
];

// MIT-associated executable Rust region: the fixed model snippets below are
// authored standard-library examples used by the lesson evaluator.
const nextActionTests = `#[test]
fn policy_boundaries() {
    assert_eq!(next_action(0, 3, 0, 100, 5, "BUSY"), Action::NotAttempted);
    assert_eq!(next_action(1, 3, 0, 100, 5, "BUSY"), Action::Retry);
    assert_eq!(next_action(1, 3, 0, 100, 5, "QUEUE_FULL"), Action::Retry);
    for status in ["CONFLICT", "FULL", "SCHEMA", "TOO_LARGE", "UTF8", "VERSION", "FIELDS", "VALIDATION", "STORAGE", "MALFORMED", "UNRECOGNIZED"] {
        assert_eq!(next_action(1, 3, 0, 100, 5, status), Action::Stop);
    }
    assert_eq!(next_action(3, 3, 0, 100, 5, "BUSY"), Action::Stop);
}`;
const nextActionSolution = `#[derive(Debug, PartialEq)]
enum Action { Retry, Stop, NotAttempted }
fn next_action(attempts_started: u32, max_attempts: u32, now: u64, deadline: u64, backoff: u64, status: &str) -> Action {
    if attempts_started == 0 || max_attempts == 0 || now >= deadline { return Action::NotAttempted; }
    if !matches!(status, "BUSY" | "QUEUE_FULL") { return Action::Stop; }
    if attempts_started >= max_attempts || now.checked_add(backoff).is_none_or(|next| next >= deadline) {
        Action::Stop
    } else {
        Action::Retry
    }
}`;
const budgetTests = `#[test]
fn budget_boundaries() {
    assert_eq!(reserve(0, 0, 10, 4, 2, 1), Reservation::Stop(StopReason::InvalidPolicy));
    assert_eq!(reserve(0, 3, 10, 4, 2, 1), Reservation::Ready { attempt_end: 6, next_start: 4 });
    assert_eq!(reserve(1, 3, 10, 4, 2, 1), Reservation::Ready { attempt_end: 7, next_start: 5 });
    assert_eq!(reserve(3, 3, 10, 4, 2, 1), Reservation::Stop(StopReason::AttemptLimit));
    assert_eq!(reserve(1, 3, 5, 4, 2, 1), Reservation::Stop(StopReason::Deadline));
    assert_eq!(reserve(1, 3, 10, 4, 2, u64::MAX), Reservation::Stop(StopReason::BackoffOverflow));
}`;
const budgetSolution = `#[derive(Debug, PartialEq)]
enum StopReason { InvalidPolicy, AttemptLimit, Deadline, BackoffOverflow }
#[derive(Debug, PartialEq)]
enum Reservation { Ready { attempt_end: u64, next_start: u64 }, Stop(StopReason) }
fn reserve(attempts_started: u32, max_attempts: u32, deadline: u64, now: u64, per_attempt: u64, backoff: u64) -> Reservation {
    if max_attempts == 0 || per_attempt == 0 || backoff == 0 { return Reservation::Stop(StopReason::InvalidPolicy); }
    if attempts_started >= max_attempts { return Reservation::Stop(StopReason::AttemptLimit); }
    if now >= deadline { return Reservation::Stop(StopReason::Deadline); }
    let delay = match backoff.checked_mul(u64::from(attempts_started)) { Some(value) => value, None => return Reservation::Stop(StopReason::BackoffOverflow) };
    let next_start = match now.checked_add(delay) { Some(value) => value, None => return Reservation::Stop(StopReason::BackoffOverflow) };
    if next_start >= deadline { return Reservation::Stop(StopReason::Deadline); }
    let attempt_end = match next_start.checked_add(per_attempt) { Some(value) => value.min(deadline), None => return Reservation::Stop(StopReason::BackoffOverflow) };
    Reservation::Ready { attempt_end, next_start }
}`;
const frameTests = `#[test]
fn driver_stops_on_terminal_reply_and_replays_one_frame() {
    let frame = b"V1\\tlogs\\tjob-7\\tINFO\\tready\\n".to_vec();
    let mut seen = Vec::new();
    let result = drive(frame.clone(), 3, |bytes| { seen.push(bytes.to_vec()); Reply::Refused(TerminalRefusal::Conflict) });
    assert_eq!(result, DriverResult::Refused { reason: TerminalRefusal::Conflict, stopped: StopReason::Terminal, attempts: 1 });
    assert_eq!(seen, vec![frame]);
    let mut uncertain = Vec::new();
    assert_eq!(drive(b"same".to_vec(), 2, |bytes| { uncertain.push(bytes.to_vec()); Reply::Transport }), DriverResult::Unknown { last: LastObservation::Transport, stopped: StopReason::AttemptLimit, attempts: 2 });
    assert_eq!(drive(b"same".to_vec(), 0, |_| Reply::Transport), DriverResult::NotAttempted { stopped: StopReason::InvalidPolicy });
    let receipt = Receipt { sequence: 7, disposition: ReceiptDisposition::Duplicate };
    assert_eq!(drive(b"same".to_vec(), 2, |bytes| { uncertain.push(bytes.to_vec()); Reply::Delivered(receipt) }), DriverResult::Delivered { receipt, attempts: 1 });
    assert_eq!(drive(b"same".to_vec(), 1, |_| Reply::Delivered(Receipt { sequence: 0, disposition: ReceiptDisposition::Inserted })), DriverResult::Unknown { last: LastObservation::Malformed, stopped: StopReason::Terminal, attempts: 1 });
    assert_eq!(uncertain, vec![b"same".to_vec(), b"same".to_vec(), b"same".to_vec()]);
}`;
const frameSolution = `#[derive(Debug, PartialEq, Clone, Copy)]
enum ReceiptDisposition { Inserted, Duplicate }
#[derive(Debug, PartialEq, Clone, Copy)]
struct Receipt { sequence: u64, disposition: ReceiptDisposition }
#[derive(Debug, PartialEq, Clone, Copy)]
enum TerminalRefusal { Conflict, Full, Schema, TooLarge, Utf8, Version, Fields, Validation }
#[derive(Debug, PartialEq, Clone, Copy)]
enum StopReason { Terminal, AttemptLimit, Deadline, InvalidPolicy }
#[derive(Debug, PartialEq, Clone, Copy)]
enum LastObservation { Receipt(Receipt), Refusal(TerminalRefusal), Transport, Malformed }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Reply { Delivered(Receipt), Refused(TerminalRefusal), Transport }
#[derive(Debug, PartialEq, Clone, Copy)]
enum DriverResult { Delivered { receipt: Receipt, attempts: usize }, Refused { reason: TerminalRefusal, stopped: StopReason, attempts: usize }, Unknown { last: LastObservation, stopped: StopReason, attempts: usize }, NotAttempted { stopped: StopReason } }
fn drive<F>(frame: Vec<u8>, max_attempts: usize, mut send: F) -> DriverResult
where F: FnMut(&[u8]) -> Reply {
    if max_attempts == 0 { return DriverResult::NotAttempted { stopped: StopReason::InvalidPolicy }; }
    let immutable = frame;
    for attempts in 1..=max_attempts {
        match send(&immutable) {
            Reply::Delivered(receipt) if receipt.sequence > 0 => return DriverResult::Delivered { receipt, attempts },
            Reply::Delivered(_) => return DriverResult::Unknown { last: LastObservation::Malformed, stopped: StopReason::Terminal, attempts },
            Reply::Refused(reason) => return DriverResult::Refused { reason, stopped: StopReason::Terminal, attempts },
            Reply::Transport if attempts == max_attempts => return DriverResult::Unknown { last: LastObservation::Transport, stopped: StopReason::AttemptLimit, attempts },
            Reply::Transport => {}
        }
    }
    DriverResult::Unknown { last: LastObservation::Transport, stopped: StopReason::AttemptLimit, attempts: max_attempts }
}`;
const aggregateTests = `#[test]
fn ambiguity_is_sticky_until_receipt() {
    assert_eq!(aggregate(&[], StopReason::InvalidPolicy), Final::NotAttempted { stopped: StopReason::InvalidPolicy });
    assert_eq!(aggregate(&[Observation::Busy, Observation::Busy], StopReason::AttemptLimit), Final::Refused { reason: TerminalRefusal::Busy, stopped: StopReason::AttemptLimit, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Timeout, Observation::Busy], StopReason::AttemptLimit), Final::Unknown { last: LastObservation::Refusal(TerminalRefusal::Busy), stopped: StopReason::AttemptLimit, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Timeout, Observation::Terminal(TerminalRefusal::Conflict)], StopReason::Terminal), Final::Unknown { last: LastObservation::Refusal(TerminalRefusal::Conflict), stopped: StopReason::Terminal, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Timeout, Observation::Receipt(Receipt { sequence: 9, disposition: ReceiptDisposition::Inserted })], StopReason::AttemptLimit), Final::Delivered { receipt: Receipt { sequence: 9, disposition: ReceiptDisposition::Inserted }, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Busy, Observation::Storage], StopReason::Terminal), Final::Unknown { last: LastObservation::Storage, stopped: StopReason::Terminal, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Transport], StopReason::AttemptLimit), Final::Unknown { last: LastObservation::Transport, stopped: StopReason::AttemptLimit, attempts: 1 });
    assert_eq!(aggregate(&[Observation::Malformed], StopReason::Terminal), Final::Unknown { last: LastObservation::Malformed, stopped: StopReason::Terminal, attempts: 1 });
    for refusal in [TerminalRefusal::Conflict, TerminalRefusal::Full, TerminalRefusal::Schema, TerminalRefusal::TooLarge, TerminalRefusal::Utf8, TerminalRefusal::Version, TerminalRefusal::Fields, TerminalRefusal::Validation] {
        assert_eq!(aggregate(&[Observation::Terminal(refusal)], StopReason::Terminal), Final::Refused { reason: refusal, stopped: StopReason::Terminal, attempts: 1 });
    }
}`;
const aggregateSolution = `#[derive(Debug, PartialEq, Clone, Copy)]
enum ReceiptDisposition { Inserted, Duplicate }
#[derive(Debug, PartialEq, Clone, Copy)]
struct Receipt { sequence: u64, disposition: ReceiptDisposition }
#[derive(Debug, PartialEq, Clone, Copy)]
enum TerminalRefusal { Busy, QueueFull, Conflict, Full, Schema, TooLarge, Utf8, Version, Fields, Validation }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Observation { Timeout, Transport, Busy, QueueFull, Storage, Malformed, Unrecognized, Terminal(TerminalRefusal), Receipt(Receipt) }
#[derive(Debug, PartialEq, Clone, Copy)]
enum StopReason { Terminal, AttemptLimit, Deadline, InvalidPolicy }
#[derive(Debug, PartialEq, Clone, Copy)]
enum LastObservation { Receipt(Receipt), Refusal(TerminalRefusal), Transport, Deadline, Storage, Malformed, Unrecognized }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Final { Delivered { receipt: Receipt, attempts: u32 }, Refused { reason: TerminalRefusal, stopped: StopReason, attempts: u32 }, Unknown { last: LastObservation, stopped: StopReason, attempts: u32 }, NotAttempted { stopped: StopReason } }
fn aggregate(observations: &[Observation], stopped: StopReason) -> Final {
    if observations.is_empty() { return Final::NotAttempted { stopped }; }
    if let Some(receipt) = observations.iter().rev().find_map(|item| match item { Observation::Receipt(receipt) if receipt.sequence > 0 => Some(*receipt), _ => None }) { return Final::Delivered { receipt, attempts: observations.len() as u32 }; }
    let last = match observations.last().unwrap() {
        Observation::Storage => LastObservation::Storage, Observation::Timeout => LastObservation::Deadline,
        Observation::Transport => LastObservation::Transport, Observation::Busy => LastObservation::Refusal(TerminalRefusal::Busy),
        Observation::QueueFull => LastObservation::Refusal(TerminalRefusal::QueueFull), Observation::Terminal(reason) => LastObservation::Refusal(*reason),
        Observation::Malformed => LastObservation::Malformed, Observation::Unrecognized => LastObservation::Unrecognized,
        Observation::Receipt(receipt) if receipt.sequence == 0 => LastObservation::Malformed,
        Observation::Receipt(_) => unreachable!(),
    };
    if observations.iter().all(|item| matches!(item, Observation::Busy | Observation::QueueFull)) { return Final::Refused { reason: if observations.iter().all(|item| matches!(item, Observation::Busy)) { TerminalRefusal::Busy } else { TerminalRefusal::QueueFull }, stopped, attempts: observations.len() as u32 }; }
    if observations.iter().any(|item| matches!(item, Observation::Timeout | Observation::Transport | Observation::Storage | Observation::Malformed | Observation::Unrecognized)) || !matches!(stopped, StopReason::Terminal) { return Final::Unknown { last, stopped, attempts: observations.len() as u32 }; }
    match last { LastObservation::Refusal(reason) => Final::Refused { reason, stopped, attempts: observations.len() as u32 }, _ => Final::Unknown { last, stopped, attempts: observations.len() as u32 } }
}`;
const reviewNextActionTests = `#[test]
fn retrieval_policy_boundaries() {
    assert_eq!(next_action(0, 0, 0, 100, 5, "BUSY"), Action::NotAttempted);
    assert_eq!(next_action(2, 2, 0, 100, 5, "QUEUE_FULL"), Action::Stop);
    assert_eq!(next_action(1, 3, 0, 100, 5, "QUEUE_FULL"), Action::Retry);
}`;
const reviewAggregateTests = `#[test]
fn retrieval_ambiguity_boundaries() {
    assert_eq!(aggregate(&[Observation::QueueFull, Observation::QueueFull], StopReason::Deadline), Final::Refused { reason: TerminalRefusal::QueueFull, stopped: StopReason::Deadline, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Transport, Observation::QueueFull], StopReason::Terminal), Final::Unknown { last: LastObservation::Refusal(TerminalRefusal::QueueFull), stopped: StopReason::Terminal, attempts: 2 });
    assert_eq!(aggregate(&[Observation::Transport, Observation::Receipt(Receipt { sequence: 3, disposition: ReceiptDisposition::Duplicate })], StopReason::Terminal), Final::Delivered { receipt: Receipt { sequence: 3, disposition: ReceiptDisposition::Duplicate }, attempts: 2 });
}`;

const nextActionStarter = `#[derive(Debug, PartialEq)]
enum Action { Retry, Stop, NotAttempted }
fn next_action(attempts_started: u32, max_attempts: u32, now: u64, deadline: u64, backoff: u64, status: &str) -> Action {
    // TODO: walidacja zerowej próby, statusu i wspólnego deadline.
    let _ = (attempts_started, max_attempts, now, deadline, backoff, status);
    todo!("zwróć Retry, Stop albo NotAttempted")
}`;
const budgetStarter = `fn reserve(attempts_started: u32, max_attempts: u32, deadline: u64, now: u64, per_attempt: u64, backoff: u64) -> Option<u64> {
    // TODO: sprawdź licznik prób, checked arithmetic i granicę przed deadline.
    let _ = (attempts_started, max_attempts, deadline, now, per_attempt, backoff);
    None
}`;
const frameStarter = `fn replay<F>(frame: Vec<u8>, mut send: F, attempts: usize) -> Vec<Vec<u8>>
where F: FnMut(&[u8]) -> Vec<u8> {
    // TODO: zmień sygnaturę na driver z Delivered/Refused/Transport.
    let _ = (frame, &mut send, attempts);
    Vec::new()
}`;
const aggregateStarter = `#[derive(Debug, PartialEq)]
enum Observation { Timeout, Transport, Busy, QueueFull, Storage, Malformed, Duplicate }
#[derive(Debug, PartialEq)]
enum StopReason { Terminal, AttemptLimit, Deadline, InvalidPolicy }
enum Final { Delivered { attempts: u32 }, Refused, Unknown, NotAttempted }
fn aggregate(observations: &[Observation], stopped: StopReason) -> Final {
    // TODO: zachowaj LastObservation, attempts i sticky Unknown.
    let _ = (observations, stopped);
    Final::NotAttempted
}`;

function predict(id: string, title: string, prompt: string, correct: string, labels: [string, string, string], explanations: [string, string, string], conceptId = "service-client-retry-policy"): LessonStep {
  return {
    id, kind: "predict", title, prompt,
    choices: labels.map((label, index) => ({ id: String(index), label })),
    evaluator: { kind: "choice", correct, explanations: Object.fromEntries(explanations.map((explanation, index) => [String(index), explanation])) },
    evidence: { version: 2, conceptIds: [conceptId] },
    evidenceKind: "prediction",
  };
}

function modelTrace(id: string, title: string, prompt: string, conceptId: string): LessonStep {
  return { id, kind: "observe", title, prompt, evaluator: { kind: "answer", accepted: ["Prześledzony model"], feedback: "Porównaj ślad z tabelą wyniku." }, evidenceKind: "exposure", evidence: { version: 2, conceptIds: [conceptId] } };
}

function testStep(id: string, title: string, prompt: string, codingTaskId: string, code: string, tests: string, kind: "modify" | "apply" | "recall" | "blank" = "modify", conceptId = "service-client-retry-policy", starter?: string, evidenceGate = false): LessonStep {
  return {
    id, kind, title, prompt, code: starter ?? code, solution: code,
    evaluator: { kind: "tests", tests }, expectedStatus: "success",
    evidence: { version: 2, conceptIds: [conceptId], codingTaskId },
    evidenceKind: kind === "recall" ? "recall" : kind === "apply" ? "transfer" : "fix",
    ...(evidenceGate ? { evidenceGate: true } : {}),
  };
}

function rubric(id: string, title: string, prompt: string, conceptId: string): LessonStep {
  const criteria = ["Wskazujesz wspólny deadline i granicę próby.", "Nie tworzysz nowej tożsamości żądania."];
  return { id, kind: "assessment", title, prompt, evaluator: { kind: "rubric", criteria }, rubric: criteria, evidenceKind: "self-rating", evidence: { version: 2, conceptIds: [conceptId] } };
}

function recallStep(id: string, title: string, prompt: string, criteria: string[], conceptId: string): LessonStep {
  return {
    id,
    kind: "recall",
    title,
    prompt,
    evaluator: { kind: "rubric", criteria },
    evidenceKind: "self-rating",
    evidence: { version: 2, conceptIds: [conceptId] },
  };
}

// CC BY 4.0-authored teaching region: Polish prompts, explanations, rubrics,
// and worksheet metadata below are original course prose, not copied code.
export const serviceClientRetryLessons: Lesson[] = [
  {
    id: "service-client-bounded-retry", moduleId: "service-client-retry", conceptIds: ["service-client-retry-policy"], competencyIds: ["service-client-bounded-policy-competency"], prerequisites: ["capstone-maintenance-recovery"], title: "Zbuduj bounded retry klienta", subtitle: "Ograniczysz próby i deadline, zanim dopuścisz replay tego samego żądania.", outcomes: ["Rozpoznasz retryable i terminalne obserwacje.", "Zarezerwujesz backoff bez przepełnienia.", "Użyjesz jednego deadline dla wszystkich faz I/O."], sessionStops: [{ afterStepId: "bounded-retry-transfer", title: "Zatrzymaj się po pierwszej praktyce", nextGoal: "Wróć do bramki wymagającej samodzielnej próby albo rozwiąż kolejny wariant kontraktu." }], steps: [
      predict("bounded-retry-predict", "Najpierw granica", "Która obserwacja pozwala rozważyć replay?", "0", ["BUSY albo QUEUE_FULL", "STORAGE bez dowodu", "Nieznany payload zawsze retry"], ["Tak: oba statusy są retryable, ale tylko przy zachowanym frame i pozostałym budżecie.", "Nie: STORAGE nie dowodzi braku zapisu, więc pozostawia Unknown i nie uruchamia automatycznego replay.", "Nie: nieznana odpowiedź jest terminalną niepewnością; nie wolno zgadywać, że retry jest bezpieczny."]),
      modelTrace("bounded-retry-model-trace", "Prześledź model", "Model: przy attempts_started=0, max_attempts=2 i deadline=20 pierwsza próba może wystartować w t=4; BUSY planuje drugi start, a receipt INSERTED(seq=7) daje Delivered. Gdy deadline jest już osiągnięty przed pierwszą próbą, wynik to NotAttempted bez I/O. To ślad obserwacyjny, nie gotowa implementacja bramki.", "service-client-retry-policy"),
      testStep("service-client-retry-next-action", "Wybierz następną akcję", "Zaimplementuj `next_action(attempts_started, max_attempts, now, deadline, backoff, status) -> Action`: attempts_started=0 lub nieważny/osiągnięty budżet daje NotAttempted/Stop bez I/O; tylko BUSY i QUEUE_FULL mogą dać Retry, a checked backoff musi zostawić następny start przed deadline. Pozostałe statusy terminalne dają Stop.", "service-client/retry-next-action-v1", nextActionSolution, nextActionTests, "modify", "service-client-retry-policy", nextActionStarter, true),
      testStep("service-client-retry-budget-reservation", "Zarezerwuj budżet", "Zaimplementuj `reserve(...) -> Reservation`: attempts_started=0 jest prawidłową pierwszą rezerwacją przy max_attempts>0; oblicz checked backoff i next_start, a per-attempt I/O deadline licz od tego rzeczywistego startu i ogranicz globalnym deadline. Zwracaj jawny StopReason dla invalid policy, limitu, deadline i overflow.", "service-client/retry-budget-reservation-v1", budgetSolution, budgetTests, "apply", "service-client-retry-policy", budgetStarter, true),
      { ...rubric("bounded-retry-observe", "Obserwacja bez obietnicy", "Opisz, co dowodzi receiptu, a czego nie dowodzi sam timeout.", "service-client-retry-policy"), kind: "observe", evidenceKind: "exposure" },
      recallStep("bounded-retry-recall", "Powtórz granice", "Wyjaśnij własnymi słowami, kiedy klient kończy bez pierwszej próby i kiedy odpowiedź serwera pozwala rozważyć ponowienie.", [
        "Wskazuję zerowy limit prób lub wyczerpanie deadline przed rozpoczęciem pierwszej próby jako przyczyny NotAttempted.",
        "Rozpoznaję BUSY i QUEUE_FULL. Kolejna próba tego samego żądania musi zmieścić się w limicie prób i wspólnym budżecie czasu.",
      ], "service-client-retry-policy"),
      testStep("bounded-retry-blank", "Odtwórz kontrakt", "Napisz od zera minimalną politykę z tymi samymi granicami.", "service-client/retry-next-action-v1", nextActionSolution, nextActionTests, "blank", "service-client-retry-policy", nextActionStarter),
      testStep("bounded-retry-budget-blank", "Odtwórz rezerwację", "Napisz od zera checked reservation bez resetowania wspólnego deadline.", "service-client/retry-budget-reservation-v1", budgetSolution, budgetTests, "blank", "service-client-retry-policy", budgetStarter),
      rubric("bounded-retry-transfer", "Przenieś politykę", "Zaplanuj test granicy, w którym opóźnienie dosięga deadline.", "service-client-retry-policy"),
      retryQueue, retryWindows,
    ], misconceptions: ["Każdy błąd jest bezpieczny do ponowienia.", "Każda próba dostaje nowy pełny timeout.", "Timeout oznacza rollback."], transferTask: "Zapisz tabelę decyzji dla BUSY, STORAGE, timeoutu i receiptu.", evidenceGate: "Dwie bramki testowe sprawdzają różne rodziny polityki: next-action i reservation.", sourceIds: [...serviceClientRetrySourceIds],
  },
  {
    id: "service-client-ambiguous-driver", moduleId: "service-client-retry", conceptIds: ["service-client-ambiguity-contract"], competencyIds: ["service-client-ambiguity-competency"], prerequisites: ["service-client-bounded-retry"], title: "Zachowaj Unknown między próbami", subtitle: "Odtworzysz ten sam frame i nie pomylisz późniejszej odmowy z dowodem rollbacku.", outcomes: ["Zachowasz immutable bytes i identity.", "Rozdzielisz receipt od ostatniej obserwacji.", "Zagregujesz Unknown bez fałszywej pewności."], sessionStops: [{ afterStepId: "ambiguous-driver-transfer", title: "Zatrzymaj się po pierwszej praktyce", nextGoal: "Wróć do bramki wymagającej samodzielnej próby albo rozwiąż kolejny wariant kontraktu." }], steps: [
      predict("ambiguous-driver-predict", "Nie zgaduj z ostatniego błędu", "Co zwrócić po timeout i późniejszym BUSY bez receiptu?", "1", ["Refused", "Unknown", "Delivered"], ["Nie: Refused wymaga terminalnej odmowy bez wcześniejszej niepewności.", "Tak: wcześniejszy timeout pozostaje sticky Unknown, dopóki nie pojawi się prawidłowy receipt.", "Nie: sama odmowa BUSY nie jest receiptem INSERTED ani DUPLICATE."], "service-client-ambiguity-contract"),
      modelTrace("ambiguous-driver-model-trace", "Prześledź niepewność", "Model: jedna niezmienna ramka ma historię Unknown(transport) → BUSY → DUPLICATE(seq=7). Końcowy wynik to Delivered z tym receipt; ta sama historia bez receipt kończy się Unknown, nawet jeśli ostatnia obserwacja wygląda terminalnie. To ślad obserwacyjny, nie gotowa implementacja bramki.", "service-client-ambiguity-contract"),
      testStep("service-client-immutable-frame-replay", "Powtórz te same bajty", "Zaimplementuj `drive(frame, max_attempts, send) -> DriverResult` z typed Receipt(seq, Inserted|Duplicate), terminalną Refused(reason, Terminal), Unknown(last, stop, attempts) i NotAttempted. Wyślij dokładnie ten sam frame; zatrzymaj się po receipt/refusal, a transport replayuj tylko w limicie.", "service-client/immutable-frame-replay-v1", frameSolution, frameTests, "modify", "service-client-ambiguity-contract", frameStarter, true),
      testStep("service-client-aggregate-uncertainty", "Agreguj obserwacje", "Zaimplementuj `aggregate(observations, stopped) -> Final` dla Receipt(seq, disposition), BUSY/QUEUE_FULL, każdej terminalnej odmowy, STORAGE, transportu, timeoutu, malformed i unrecognized. Receipt rozstrzyga Delivered; bez niego prior uncertainty pozostaje Unknown, a czysta seria overloadu może dać Refused.", "service-client/aggregate-uncertainty-v1", aggregateSolution, aggregateTests, "apply", "service-client-ambiguity-contract", aggregateStarter, true),
      { ...rubric("ambiguous-driver-observe", "Odczytaj granicę", "Porównaj INSERTED, DUPLICATE i brak kompletnej odpowiedzi.", "service-client-ambiguity-contract"), kind: "observe", evidenceKind: "exposure" },
      recallStep("ambiguous-driver-recall", "Powtórz niepewność", "Klient wysłał żądanie, ale nie odebrał pełnej odpowiedzi. Wyjaśnij własnymi słowami, co uzasadnia Delivered i kiedy po zakończeniu prób pozostaje Unknown.", [
        "Dostarczony zapis potwierdza poprawne pokwitowanie INSERTED lub DUPLICATE dla tego żądania z dodatnim numerem sekwencji.",
        "Po niejednoznacznej próbie utrata odpowiedzi, timeout lub STORAGE pozostawia niepewność co do zapisu. Późniejsza odmowa sama tej niepewności nie usuwa.",
      ], "service-client-ambiguity-contract"),
      testStep("ambiguous-driver-frame-blank", "Odtwórz replay", "Napisz callback-driven replay zachowujący jeden frame.", "service-client/immutable-frame-replay-v1", frameSolution, frameTests, "blank", "service-client-ambiguity-contract", frameStarter),
      testStep("ambiguous-driver-blank", "Odtwórz agregację", "Napisz agregator, w którym terminalna odmowa nie kasuje Unknown.", "service-client/aggregate-uncertainty-v1", aggregateSolution, aggregateTests, "blank", "service-client-ambiguity-contract", aggregateStarter),
      rubric("ambiguous-driver-transfer", "Przenieś do runbooka", "Opisz, kiedy operator może powiedzieć Delivered, a kiedy tylko Unknown.", "service-client-ambiguity-contract"),
      retryReplicas, retryLedger,
    ], misconceptions: ["Najnowszy błąd zawsze rozstrzyga.", "DUPLICATE tworzy nowy zapis.", "Można dopytać serwer o receipt, choć protokół tego nie ma."], transferTask: "Narysuj cztery wyniki dla historii timeout → BUSY → receipt.", evidenceGate: "Dwie bramki testowe rozdzielają immutable replay i agregację niepewności.", sourceIds: [...serviceClientRetrySourceIds],
  },
];

export const serviceClientRetryReviewExercises: Record<string, LessonStep> = {
  "service-client-retry-policy": testStep("review-service-client-retry-policy", "Powtórka: bounded policy", "Odtwórz osobny test retrieval dla zerowej polityki, QUEUE_FULL i końca limitu.", "service-client/retry-next-action-v1", nextActionSolution, reviewNextActionTests, "recall", "service-client-retry-policy", nextActionStarter),
  "service-client-ambiguity-contract": testStep("review-service-client-ambiguity-contract", "Powtórka: sticky Unknown", "Odtwórz osobny test retrieval dla QUEUE_FULL, transportu i receiptu.", "service-client/aggregate-uncertainty-v1", aggregateSolution, reviewAggregateTests, "recall", "service-client-ambiguity-contract", aggregateStarter),
};

export const serviceClientRetryModule: CourseModule = {
  id: "service-client-retry", title: "Klient bounded retry i niepewność", whyItMatters: "Serwis może przyjąć zapis, zanim klient zobaczy odpowiedź. Klient potrzebuje ograniczonej polityki i uczciwego wyniku.", capabilities: serviceClientRetryCompetencies.map((item) => item.title), prerequisites: ["capstone-integration"], lessonIds: serviceClientRetryLessons.map((lesson) => lesson.id), exitGate: ["Rozróżniasz retryable, terminalne i niepewne obserwacje.", "Zachowujesz ten sam frame oraz sticky Unknown bez receiptu."], projectConnection: "Opcjonalny lokalny lab klienta retry używa istniejącego serwisu jako referencji; model lekcji nie uruchamia kodu ucznia ani zewnętrznego systemu.", assessmentId: "ambiguous-driver-blank", gateCriteria: [
    { id: "service-client-retry-next-action-gate", label: "Polityka next-action rozróżnia retry i terminal.", taskRefs: [{ lessonId: "service-client-bounded-retry", stepId: "service-client-retry-next-action" }, { lessonId: "service-client-bounded-retry", stepId: "bounded-retry-blank" }, { lessonId: "service-client-bounded-retry", stepId: retryQueue.id }], requiredIndependentCodingTasks: 1 },
    { id: "service-client-retry-budget-gate", label: "Reservation chroni próbę, deadline i backoff.", taskRefs: [{ lessonId: "service-client-bounded-retry", stepId: "service-client-retry-budget-reservation" }, { lessonId: "service-client-bounded-retry", stepId: "bounded-retry-budget-blank" }, { lessonId: "service-client-bounded-retry", stepId: retryWindows.id }], supplementaryStepRefs: [{ lessonId: "service-client-bounded-retry", stepId: "bounded-retry-observe" }], requiredIndependentCodingTasks: 1 },
    { id: "service-client-frame-replay-gate", label: "Replay zachowuje jeden immutable frame.", taskRefs: [{ lessonId: "service-client-ambiguous-driver", stepId: "service-client-immutable-frame-replay" }, { lessonId: "service-client-ambiguous-driver", stepId: "ambiguous-driver-frame-blank" }, { lessonId: "service-client-ambiguous-driver", stepId: retryReplicas.id }], requiredIndependentCodingTasks: 1 },
    { id: "service-client-aggregate-gate", label: "Agregacja potwierdza receipt albo zachowuje Unknown.", taskRefs: [{ lessonId: "service-client-ambiguous-driver", stepId: "service-client-aggregate-uncertainty" }, { lessonId: "service-client-ambiguous-driver", stepId: "ambiguous-driver-blank" }, { lessonId: "service-client-ambiguous-driver", stepId: retryLedger.id }], supplementaryStepRefs: [{ lessonId: "service-client-ambiguous-driver", stepId: "ambiguous-driver-observe" }], requiredIndependentCodingTasks: 1 },
  ],
};
