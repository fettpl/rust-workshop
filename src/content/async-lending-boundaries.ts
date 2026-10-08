import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

const reviewedAt = "2026-09-19";

export const asyncLendingBoundarySources: Source[] = [
  {
    id: "async-lending-boundary-send",
    title: "Tokio task::spawn documentation",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj wymagania Send + 'static przy zmianie przykładu spawn.",
  },
  {
    id: "async-lending-boundary-dyn",
    title: "Rust Reference: dyn compatibility",
    url: "https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj ograniczenia obiektów traitów po zmianie adaptera.",
  },
  {
    id: "async-lending-boundary-cancel",
    title: "Rust standard library: Drop",
    url: "https://doc.rust-lang.org/std/ops/trait.Drop.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj rozróżnienie Drop i rollbacku efektów.",
  },
];

export const asyncLendingBoundaryCompetencies: Competency[] = [
  {
    id: "async-lending-cancel-commit",
    title:
      "Rozdzielasz odbiór, ukończenie callbacku i commit kursora oraz opisujesz skutki anulowania.",
  },
  {
    id: "async-lending-send-boundary",
    title:
      "Rozpoznajesz osobno Send właściciela, Send future i wymóg 'static Tokio spawn.",
  },
  {
    id: "async-lending-dyn-adapter",
    title:
      "Dobierasz statyczny lending lub jawny boxed adapter dla heterogenicznych providerów.",
  },
];

export const asyncLendingBoundaryConcepts: Concept[] = [
  {
    id: "async-lending-cancel-commit",
    title: "Commit jest po ukończonym callbacku",
    prerequisites: ["async-lending-callback-borrow"],
    competencyIds: ["async-lending-cancel-commit"],
    reviewPrompt: "Co pozostaje prawdą po anulowaniu callbacku przed commit?",
    reviewAnswer:
      "Efekty wykonane przed Drop pozostają, lecz kursor nie przesuwa się, jeśli commit nie nastąpił. Commit po Ready nie jest automatycznie cofany.",
    distinguish:
      "Odbiór danych, ukończenie callbacku i zapis postępu to trzy różne obserwacje; Drop future nie jest transakcją.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "async-lending-send-boundary",
    title: "Owned future na granicy Tokio spawn",
    prerequisites: ["async-lending-cancel-commit", "send-sync"],
    competencyIds: ["async-lending-send-boundary"],
    reviewPrompt:
      "Dlaczego lokalna pożyczka może być bezpieczna sekwencyjnie, ale nie nadaje się do tokio::spawn?",
    reviewAnswer:
      "Spawn musi móc przechować future do nieznanego momentu i przenieść go między wątkami, więc wymaga Send + 'static. Lokalny borrowed callback może mieć krótsze życie, jeśli jest awaitowany na miejscu.",
    distinguish:
      "Send future nie oznacza samo z siebie 'static, a Send właściciela nie naprawia pożyczki przechowywanej w future.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "async-lending-dyn-adapter",
    title: "Jawny koszt boxed adaptera",
    prerequisites: ["async-lending-send-boundary", "dyn-dispatch"],
    competencyIds: ["async-lending-dyn-adapter"],
    reviewPrompt: "Kiedy boxed adapter jest uczciwą granicą heterogeniczności?",
    reviewAnswer:
      "Gdy API jawnie zwraca pudełkowany future związany z lifetime wywołania; koszt alokacji i dispatchu jest wtedy częścią kontraktu. Static lending pozostaje prostsze, jeśli typy są znane.",
    distinguish:
      "Boxed adapter nie czyni dowolnego GAT traitu dyn-compatible i nie daje automatycznie Send + 'static.",
    evidenceArtifact: "rust-code",
  },
];

const boundaryEvidenceFamilies: Record<string, string> = {
  "async-lending-cancel-commit": "async-lending/cancel-commit-v1",
  "async-lending-send-boundary": "async-lending/send-boundary-v1",
  "async-lending-dyn-adapter": "async-lending/dyn-adapter-v1",
};

for (const concept of asyncLendingBoundaryConcepts) {
  concept.evidenceCalibration = { version: 2, minimumCodingTasks: 2 };
}

function coding(options: {
  id: string;
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  expectedStatus?: "success" | "compile-error" | "runtime-error";
  expectedDiagnostic?: string;
}): LessonStep {
  return {
    id: options.id,
    kind: options.code === undefined ? "blank" : "debug",
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined
      ? {}
      : {
          code: options.code,
          expectedStatus: options.expectedStatus ?? ("success" as const),
          ...(options.expectedDiagnostic === undefined
            ? {}
            : { expectedDiagnostic: options.expectedDiagnostic }),
        }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind: options.code === undefined ? "assessment" : "fix",
    evidenceGate: true,
  };
}

const commitSolution = `
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct Cursor { items: Vec<String>, next: usize }
struct Lease<'a> { cursor: &'a mut Cursor, index: usize }
impl Cursor {
    fn new(items: Vec<String>) -> Self { Self { items, next: 0 } }
    fn receive(&mut self) -> Option<Lease<'_>> {
        let index = self.next;
        self.items.get(index)?;
        Some(Lease { cursor: self, index })
    }
}
impl Lease<'_> {
    fn value(&self) -> &str { &self.cursor.items[self.index] }
    fn commit(self) { self.cursor.next += 1; }
}

struct EffectFuture<'a> { value: &'a str, effects: &'a mut Vec<u8>, pending: bool }
impl<'a> EffectFuture<'a> {
    fn new(value: &'a str, effects: &'a mut Vec<u8>) -> Self { Self { value, effects, pending: true } }
}
impl Future for EffectFuture<'_> {
    type Output = ();
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        this.effects.push(this.value.as_bytes()[0]);
        if this.pending {
            this.pending = false;
            cx.waker().wake_by_ref();
            Poll::Pending
        } else {
            Poll::Ready(())
        }
    }
}

fn poll_once<F: Future>(mut future: Pin<&mut F>) -> Poll<F::Output> {
    use std::sync::Arc;
    use std::task::{Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let waker = Waker::from(Arc::new(Noop));
    let mut cx = Context::from_waker(&waker);
    future.as_mut().poll(&mut cx)
}

fn block_on<F: Future>(mut future: F) -> F::Output {
    let mut future = Box::pin(future);
    for _ in 0..32 {
        if let Poll::Ready(value) = poll_once(future.as_mut()) { return value; }
    }
    panic!("future exceeded the bounded poll budget")
}

fn process(cursor: &mut Cursor, effects: &mut Vec<u8>, cancel: bool) -> Result<usize, &'static str> {
    let lease = cursor.receive().ok_or("empty")?;
    let mut callback = Box::pin(EffectFuture::new(lease.value(), effects));
    if cancel {
        assert!(poll_once(callback.as_mut()).is_pending());
        drop(callback);
        return Err("cancel before commit");
    }
    block_on(callback);
    lease.commit();
    Ok(1)
}
`;
const commitStarter = commitSolution.replace(
  'let lease = cursor.receive().ok_or("empty")?;',
  'let lease = cursor.receive().ok_or("empty")?;\n    cursor.next += 1;',
);
const commitTests = `
#[test]
fn cancellation_before_commit_keeps_cursor_and_completed_commit_is_not_rolled_back() {
    let mut cursor = Cursor::new(vec!["pierwszy".into(), "drugi".into()]);
    let mut effects = Vec::new();
    assert_eq!(process(&mut cursor, &mut effects, true), Err("cancel before commit"));
    assert_eq!(effects, vec![b'p']);
    assert_eq!(cursor.next, 0);
    assert_eq!(process(&mut cursor, &mut effects, false), Ok(1));
    assert_eq!(cursor.next, 1);
    assert_eq!(effects, vec![b'p', b'p', b'p']);
}
#[test]
fn processing_exhausts_after_committed_items() {
    let mut cursor = Cursor::new(vec!["x".into()]);
    let mut effects = Vec::new();
    assert_eq!(process(&mut cursor, &mut effects, false), Ok(1));
    assert_eq!(process(&mut cursor, &mut effects, false), Err("empty"));
}
`;

const sendSolution = `
use std::future::Future;
use std::pin::Pin;
struct OwnedReport { bytes: Vec<u8> }
fn owned_report(bytes: Vec<u8>) -> impl Future<Output = OwnedReport> + Send + 'static {
    async move { OwnedReport { bytes } }
}
fn assert_spawnable<T>(future: T) -> T where T: Future + Send + 'static { future }
`;
const sendStarter = `
use std::future::Future;
use std::rc::Rc;

fn borrowed_report<'a>(local: &'a Rc<Vec<u8>>) -> impl Future<Output = usize> + 'a {
    async move {
        std::future::ready(()).await;
        local.len()
    }
}
fn assert_spawnable<T>(future: T) -> T where T: Future + Send + 'static { future }
fn main() {
    let local = Rc::new(vec![1, 2, 3]);
    let future = borrowed_report(&local);
    let _ = assert_spawnable(future);
}
`;
const sendTests = `
#[test]
fn owned_report_future_is_send_and_static() {
    let future = assert_spawnable(owned_report(b"raport".to_vec()));
    let _ = future;
}
#[test]
fn owned_result_keeps_all_bytes() {
    let report = owned_report(vec![1, 2, 3]);
    let mut future = Box::pin(report);
    let waker = std::task::Waker::from(std::sync::Arc::new(Noop));
    let mut cx = std::task::Context::from_waker(&waker);
    match future.as_mut().poll(&mut cx) { std::task::Poll::Ready(value) => assert_eq!(value.bytes, vec![1, 2, 3]), std::task::Poll::Pending => panic!("owned future should be ready") }
}
struct Noop;
impl std::task::Wake for Noop { fn wake(self: std::sync::Arc<Self>) {} }
`;

const adapterSolution = `
use std::future::Future;
use std::pin::Pin;

#[derive(Clone, Debug, PartialEq, Eq)]
struct Report(Vec<u8>);
trait Provider {
    fn next<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<Report>> + 'a>>;
}
struct Boxed<'a> { provider: Box<dyn Provider + 'a> }
impl<'a> Boxed<'a> {
    fn new<P: Provider + 'a>(provider: P) -> Self { Self { provider: Box::new(provider) } }
    async fn one(mut self) -> Option<Report> { self.provider.next().await }
}
struct Local<'a> { bytes: &'a [u8], done: bool }
impl Provider for Local<'_> {
    fn next<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<Report>> + 'a>> {
        Box::pin(async move { if self.done { None } else { self.done = true; Some(Report(self.bytes.to_vec())) } })
    }
}
`;
const adapterStarter = adapterSolution.replace(
  "self.provider.next().await",
  'todo!("box one borrowed future")',
);
const adapterTests = `
fn block_on<F: std::future::Future>(future: F) -> F::Output {
    use std::task::{Context, Poll, Waker};
    let waker = Waker::from(std::sync::Arc::new(Noop));
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    for _ in 0..32 { match future.as_mut().poll(&mut cx) { Poll::Ready(value) => return value, Poll::Pending => {} } }
    panic!("future exceeded the bounded poll budget")
}
struct Noop;
impl std::task::Wake for Noop { fn wake(self: std::sync::Arc<Self>) {} }
#[test]
fn adapter_accepts_a_local_lifetime_and_returns_owned_data() {
    let text = String::from("lokalny");
    let report = block_on(Boxed::new(Local { bytes: text.as_bytes(), done: false }).one());
    assert_eq!(report, Some(Report(text.into_bytes())));
}
`;

export const asyncLendingBoundaryLessons: Lesson[] = [
  {
    id: "async-lending-cancel-commit",
    moduleId: "async-lending-contracts",
    conceptIds: ["async-lending-cancel-commit"],
    competencyIds: ["async-lending-cancel-commit"],
    prerequisites: ["async-lending-callbacks"],
    title: "Anulowanie przed commit",
    subtitle: "Odbiór i efekt callbacku nie są transakcją",
    minutes: 18,
    outcomes: [
      "zatrzymasz kursor przed commit",
      "opiszesz efekt, którego Drop nie cofa",
    ],
    steps: [
      {
        id: "async-lending-cancel-commit-predict",
        kind: "predict",
        title: "Przewiduj anulowanie",
        prompt: "Czy Drop cofa efekt callbacku?",
        choices: [
          { id: "no", label: "Nie" },
          { id: "yes", label: "Tak" },
        ],
        evaluator: {
          kind: "choice",
          correct: "no",
          explanations: {
            no: "Drop kończy future, ale nie jest rollbackiem.",
            yes: "Efekty zewnętrzne wymagają osobnego protokołu.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "async-lending-cancel-commit-explain",
        kind: "explain",
        title: "Trzy punkty obserwacji",
        prompt: "Rozdziel receive, callback i commit.",
        explanation:
          "Każdy punkt ma osobną odpowiedzialność i obserwowalny skutek.",
        evaluator: {
          kind: "answer",
          accepted: ["To trzy osobne punkty.", "osobne punkty"],
          feedback: "Receive, callback i commit mają różne kontrakty.",
        },
        evidenceKind: "exposure",
      },
      coding({
        id: "async-lending-cancel-commit-gate",
        title: "Napraw kolejność commit",
        prompt:
          "Commituj dokładnie po ukończonym callbacku; anulowanie przed nim ma zostawić ten sam rekord. Gate i blank są dwiema formami jednej rodziny kontraktu.",
        code: commitStarter,
        solution: commitSolution,
        tests: commitTests,
        hints: [
          "Nie zapisuj kursora przed sprawdzeniem błędu.",
          "Po commit nie ma automatycznego rollbacku.",
        ],
        expectedStatus: "compile-error",
        expectedDiagnostic: "E0503",
      }),
      coding({
        id: "async-lending-cancel-commit-blank",
        title: "Zaprojektuj protokół",
        prompt:
          "Zdefiniuj Cursor::new(items: Vec<String>) -> Cursor, Cursor::receive(&mut self) -> Option<Lease<'_>>, Lease::value(&self) -> &str i Lease::commit(self). Zachowaj EffectFuture::new(value: &str, effects: &mut Vec<u8>) -> EffectFuture oraz process(cursor: &mut Cursor, effects: &mut Vec<u8>, cancel: bool) -> Result<usize, &'static str>: anulowanie po pierwszym Pending może zapisać efekt, ale nie przesuwa next; po dwóch pollach udanego callbacku commit przesuwa dokładnie jeden rekord, a pusty cursor zwraca Err(\"empty\"). Blank zachowuje tę samą rodzinę dowodu co gate.",
        solution: commitSolution,
        tests: commitTests,
        hints: [
          "Lease może zwolnić pożyczkę bez zmiany next.",
          "Tylko commit przesuwa next.",
        ],
      }),
      {
        id: "async-lending-cancel-commit-recall",
        kind: "recall",
        title: "Przypomnij commit",
        prompt: "Kiedy kursor może się przesunąć?",
        evaluator: {
          kind: "answer",
          accepted: ["Po ukończeniu callbacku.", "po callbacku"],
          feedback: "Commit należy do zakończonej pracy.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "Drop cofa efekt callbacku",
      "Ready odbioru jest równoznaczne z commit",
    ],
    transferTask:
      "Dodaj do raportu osobne liczniki received, completed i committed.",
    evidenceGate:
      "Udowodnij brak postępu po anulowaniu i trwałość ukończonego commit.",
    sourceIds: asyncLendingBoundarySources.map((source) => source.id),
  },
  {
    id: "async-lending-send-boundary",
    moduleId: "async-lending-contracts",
    conceptIds: ["async-lending-send-boundary"],
    competencyIds: ["async-lending-send-boundary"],
    prerequisites: ["async-lending-cancel-commit"],
    title: "Granica Send i spawn",
    subtitle: "Owned producer może wejść do zadania",
    minutes: 18,
    outcomes: [
      "sprawdzisz Send + 'static",
      "oddzielisz lokalny callback od owned future",
    ],
    steps: [
      {
        id: "async-lending-send-boundary-predict",
        kind: "predict",
        title: "Przewiduj spawn",
        prompt: "Czy lokalny borrowed future spełnia 'static?",
        choices: [
          { id: "no", label: "Nie" },
          { id: "yes", label: "Tak" },
        ],
        evaluator: {
          kind: "choice",
          correct: "no",
          explanations: {
            no: "Lokalna pożyczka kończy się wcześniej.",
            yes: "Spawn wymaga przechowania future.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "async-lending-send-boundary-explain",
        kind: "explain",
        title: "Dwie granice",
        prompt: "Rozdziel Send i 'static.",
        explanation:
          "Send mówi o przenoszeniu między wątkami, a 'static o braku krótszych pożyczek.",
        evaluator: {
          kind: "answer",
          accepted: ["Send i 'static są osobne.", "osobne boundy"],
          feedback: "Send dotyczy wątków, a 'static lifetime.",
        },
        evidenceKind: "exposure",
      },
      coding({
        id: "async-lending-send-boundary-gate",
        title: "Ustal kontrakt spawn",
        prompt:
          "Napraw typ future tak, aby owned dane spełniały Send + 'static i nie wymagały lokalnej referencji. Gate i blank opisują jedną rodzinę granicy spawn.",
        code: sendStarter,
        solution: sendSolution,
        tests: sendTests,
        hints: [
          "Wymagania należą do future zwracanego przez funkcję.",
          "Przechowuj Vec<u8>, a nie referencję do lokalnego bufora.",
        ],
        expectedStatus: "compile-error",
        expectedDiagnostic: "future cannot be sent",
      }),
      coding({
        id: "async-lending-send-boundary-blank",
        title: "Zbuduj owned producer",
        prompt:
          "Zdefiniuj struct OwnedReport { bytes: Vec<u8> }, fn owned_report(bytes: Vec<u8>) -> impl Future<Output = OwnedReport> + Send + 'static oraz fn assert_spawnable<T>(future: T) -> T where T: Future + Send + 'static. Future ma przejąć owned Vec<u8>, być gotowy bez pożyczonego wejścia i zachować wszystkie bajty w OwnedReport. To druga forma tej samej rodziny granicy spawn, bez świeżego wariantu.",
        solution: sendSolution,
        tests: sendTests,
        hints: [
          "async move przejmuje Vec.",
          "Dodaj jawny helper sprawdzający Send + 'static.",
        ],
      }),
      {
        id: "async-lending-send-boundary-recall",
        kind: "recall",
        title: "Przypomnij wymaganie",
        prompt: "Jakie dwa boundy są potrzebne do spawn?",
        evaluator: {
          kind: "answer",
          accepted: ["Send i 'static.", "Send + 'static"],
          feedback: "Tokio może przechować i przenieść future.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "każdy async future jest Send",
      "Send automatycznie przedłuża lifetime",
    ],
    transferTask:
      "Porównaj ten future z lokalnym borrowed callbackiem i zapisz, który może zostać spawnowany.",
    evidenceGate: "Udowodnij granicę Send, 'static i zachowanie owned danych.",
    sourceIds: asyncLendingBoundarySources.map((source) => source.id),
  },
  {
    id: "async-lending-dyn-adapter",
    moduleId: "async-lending-contracts",
    conceptIds: ["async-lending-dyn-adapter"],
    competencyIds: ["async-lending-dyn-adapter"],
    prerequisites: ["async-lending-send-boundary"],
    title: "Static lending albo boxed adapter",
    subtitle: "Heterogeniczność ma jawny koszt",
    minutes: 20,
    outcomes: [
      "obsłużysz lokalny lifetime przez boxed future",
      "wyjaśnisz ograniczenie dyn compatibility",
    ],
    steps: [
      {
        id: "async-lending-dyn-adapter-predict",
        kind: "predict",
        title: "Przewiduj dyn",
        prompt: "Czy każdy GAT trait można użyć jako dyn?",
        choices: [
          { id: "no", label: "Nie" },
          { id: "yes", label: "Tak" },
        ],
        evaluator: {
          kind: "choice",
          correct: "no",
          explanations: {
            no: "Dyn compatibility wymaga spełnienia osobnych reguł.",
            yes: "Rodzinny wynik sam nie tworzy obiektu traitu.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "async-lending-dyn-adapter-explain",
        kind: "explain",
        title: "Koszt pudełka",
        prompt: "Co dokumentuje boxed adapter?",
        explanation:
          "Alokację i dynamiczne wywołanie oraz lifetime future ograniczony do wywołania.",
        evaluator: {
          kind: "answer",
          accepted: ["Alokację i dynamiczne wywołanie.", "alokację"],
          feedback: "Boxing jest jawnie opisaną granicą kosztu.",
        },
        evidenceKind: "exposure",
      },
      coding({
        id: "async-lending-dyn-adapter-gate",
        title: "Napraw adapter",
        prompt:
          "Zwróć boxed future związany z lifetime wywołania i oddaj owned raport po jego ukończeniu. Gate i blank pozostają jedną rodziną adaptera.",
        code: adapterStarter,
        solution: adapterSolution,
        tests: adapterTests,
        hints: [
          "Trait object może mieć lifetime adaptera.",
          "Boxed future pożycza providera tylko do await.",
        ],
      }),
      coding({
        id: "async-lending-dyn-adapter-blank",
        title: "Zbuduj heterogeniczną granicę",
        prompt:
          "Zdefiniuj #[derive(Clone, Debug, PartialEq, Eq)] struct Report(Vec<u8>), trait Provider { fn next<'a>(&'a mut self) -> Pin<Box<dyn Future<Output = Option<Report>> + 'a>> }, struct Boxed<'a>, Boxed::new<P: Provider + 'a>(provider: P) -> Boxed<'a> oraz async fn Boxed::one(self) -> Option<Report>. Adapter ma awaitować future pożyczający providera do końca wywołania i zwracać owned Report; Local<'a> z bytes: &'a [u8] zwraca kopię przy pierwszym next, a potem None. Zachowaj lokalny lifetime i nie udawaj, że trait GAT jest bezpośrednio dyn-compatible. Ta forma dzieli rodzinę dowodu z gate.",
        solution: adapterSolution,
        tests: adapterTests,
        hints: [
          "Użyj Pin<Box<dyn Future + 'a>>.",
          "Oddaj Report posiadający dane.",
        ],
      }),
      {
        id: "async-lending-dyn-adapter-recall",
        kind: "recall",
        title: "Przypomnij wybór",
        prompt: "Kiedy wybrać static lending?",
        evaluator: {
          kind: "answer",
          accepted: [
            "Gdy typy są znane i nie potrzebujesz heterogenicznego dispatchu.",
            "gdy typy są znane",
          ],
          feedback: "Static API nie płaci za boxed dispatch.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "dyn robi każdy trait automatycznie obiektowym",
      "boxing usuwa koszt dispatchu",
    ],
    transferTask:
      "Zapisz ADR: kiedy wybrać static lending, a kiedy boxed adapter.",
    evidenceGate:
      "Udowodnij heterogenicznego providera, lokalny lifetime i owned wynik.",
    sourceIds: asyncLendingBoundarySources.map((source) => source.id),
  },
];

for (const lesson of asyncLendingBoundaryLessons) {
  const family = boundaryEvidenceFamilies[lesson.id];
  for (const step of lesson.steps) {
    step.evidence = {
      version: 2,
      conceptIds: [...lesson.conceptIds],
      ...(step.id.endsWith("-gate") || step.id.endsWith("-blank")
        ? { codingTaskId: family }
        : {}),
    };
  }
}

const commitReviewSolution =
  commitSolution.replace("if cancel {", "if matches!(cancel, true) {") +
  `
fn cancel_and_report(cursor: &mut Cursor, effects: &mut Vec<u8>) -> Result<usize, &'static str> {
    let lease = cursor.receive().ok_or("empty")?;
    let mut callback = Box::pin(EffectFuture::new(lease.value(), effects));
    assert!(poll_once(callback.as_mut()).is_pending());
    drop(callback);
    Err("cancel before commit")
}
`;
const commitReviewTests = `${commitTests}
#[test]
fn cancel_and_report_preserves_effects_and_cursor() {
    let mut cursor = Cursor::new(vec!["z".into()]);
    let mut effects = Vec::new();
    assert_eq!(cancel_and_report(&mut cursor, &mut effects), Err("cancel before commit"));
    assert_eq!(effects, vec![b'z']);
    assert_eq!(cursor.next, 0);
}
`;
const sendReviewSolution =
  sendSolution.replace(
    "async move { OwnedReport { bytes } }",
    "async move { let owned: Vec<u8> = bytes.into_iter().collect(); OwnedReport { bytes: owned } }",
  ) +
  `
async fn own_report_via_handoff(bytes: Vec<u8>) -> OwnedReport {
    let owned: Vec<u8> = bytes.into_iter().collect();
    std::future::ready(()).await;
    OwnedReport { bytes: owned }
}
`;
const sendReviewTests = `${sendTests}
#[test]
fn own_report_via_handoff_is_send_static() {
    let future = own_report_via_handoff(vec![4, 5]);
    let mut future = Box::pin(assert_spawnable(future));
    let waker = std::task::Waker::from(std::sync::Arc::new(Noop));
    let mut cx = std::task::Context::from_waker(&waker);
    match future.as_mut().poll(&mut cx) {
        std::task::Poll::Ready(report) => assert_eq!(report.bytes, vec![4, 5]),
        std::task::Poll::Pending => panic!("owned future should be ready"),
    }
}
`;
const adapterReviewSolution =
  adapterSolution.replace(
    "self.provider.next().await",
    "let future = self.provider.next(); future.await",
  ) +
  `
async fn materialize<'a>(adapter: Boxed<'a>) -> Vec<Report> {
    let mut reports = Vec::new();
    if let Some(report) = adapter.one().await {
        reports.push(report);
    }
    reports
}
`;
const adapterReviewTests = `${adapterTests}
#[test]
fn materialize_collects_a_local_provider() {
    let text = String::from("review");
    let reports = block_on(materialize(Boxed::new(Local {
        bytes: text.as_bytes(),
        done: false,
    })));
    assert_eq!(reports[0].0, text.into_bytes());
}
`;

export const asyncLendingBoundaryReviewExercises: Record<string, LessonStep> = {
  "async-lending-cancel-commit": {
    id: "async-lending-cancel-commit-review",
    kind: "blank",
    title: "Powtórka commit",
    prompt:
      "Zaimplementuj dokładnie `fn cancel_and_report(cursor: &mut Cursor, effects: &mut Vec<u8>) -> Result<usize, &'static str>`: wykonaj efekt callbacku, porzuć future przed commit i zachowaj kursor.",
    solution: commitReviewSolution,
    evaluator: { kind: "tests", tests: commitReviewTests },
    hints: ["Drop lease nie zmienia next.", "Commit jest jawny."],
    evidenceKind: "recall",
  },
  "async-lending-send-boundary": {
    id: "async-lending-send-boundary-review",
    kind: "blank",
    title: "Powtórka Send",
    prompt:
      "Zaimplementuj dokładnie `async fn own_report_via_handoff(bytes: Vec<u8>) -> OwnedReport`: przenieś dane przez await i zwróć owned raport spełniający Send + 'static.",
    solution: sendReviewSolution,
    evaluator: { kind: "tests", tests: sendReviewTests },
    hints: ["Przenieś Vec.", "Sprawdź Send + 'static."],
    evidenceKind: "recall",
  },
  "async-lending-dyn-adapter": {
    id: "async-lending-dyn-adapter-review",
    kind: "blank",
    title: "Powtórka adaptera",
    prompt:
      "Zaimplementuj dokładnie `async fn materialize<'a>(adapter: Boxed<'a>) -> Vec<Report>`: awaituj lokalnego providera i zbierz owned raporty przez jawny przepływ Option.",
    solution: adapterReviewSolution,
    evaluator: { kind: "tests", tests: adapterReviewTests },
    hints: [
      "Box future ma lifetime wywołania.",
      "Provider może pożyczać lokalny tekst.",
    ],
    evidenceKind: "recall",
  },
};

for (const [conceptId, review] of Object.entries(
  asyncLendingBoundaryReviewExercises,
)) {
  review.evidence = {
    version: 2,
    conceptIds: [conceptId],
    codingTaskId: `review/${review.id}-v1`,
  };
}
