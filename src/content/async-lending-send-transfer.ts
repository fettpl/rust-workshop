import type { LessonStep } from "../domain/types";

// Pure source contracts shared by the browser assessment and native evidence.
const signature = `pub fn prepare_handoff<F, P>(records: &[String], mut format: F, pause: P)
    -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<String>> + Send + 'static>>
where
    F: FnMut(&str) -> String,
    P: std::future::Future<Output = ()> + Send + 'static
`;
const loopPreparation = `    let mut prepared = Vec::with_capacity(records.len());
    for record in records { prepared.push(format(record)); }`;
const awaitOutput = `    Box::pin(async move { pause.await; prepared })`;
const sendTransferSolution = `${signature}{
${loopPreparation}
${awaitOutput}
}
`;
export const sendTransferEquivalent = `${signature}{
    let prepared: Vec<String> = records.iter().map(|record| format(record)).collect();
    Box::pin(async move {
        pause.await;
        prepared
    })
}
`;
// Pin<Box<P>> permits a !Unpin pause without unsafe projection or an extra bound.
export const sendTransferManual = `${signature}{
    let prepared: Vec<String> = records.iter().map(|record| format(record)).collect();
    Box::pin(PreparedState { pause: Box::pin(pause), prepared: Some(prepared) })
}
struct PreparedState<P> { pause: std::pin::Pin<Box<P>>, prepared: Option<Vec<String>> }
impl<P: std::future::Future<Output = ()>> std::future::Future for PreparedState<P> {
    type Output = Vec<String>;
    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> std::task::Poll<Self::Output> {
        let this = self.get_mut();
        match this.pause.as_mut().poll(cx) {
            std::task::Poll::Pending => std::task::Poll::Pending,
            std::task::Poll::Ready(()) => std::task::Poll::Ready(this.prepared.take().expect("polled after Ready")),
        }
    }
}
`;

const sendTransferTests = `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll, Wake, Waker};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, AtomicUsize, Ordering}};
use std::rc::Rc;
use std::cell::RefCell;
use std::marker::PhantomPinned;

type Handoff = Pin<Box<dyn Future<Output = Vec<String>> + Send + 'static>>;
#[derive(Default)]
struct Seen { ready: AtomicBool, polls: AtomicUsize, waker: Mutex<Option<Waker>> }
// Deliberately neither Clone nor Unpin. All mutation goes through shared state.
struct Pause { seen: Arc<Seen>, _pinned: PhantomPinned }
impl Future for Pause {
    type Output = ();
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> {
        let seen = &self.as_ref().get_ref().seen;
        seen.polls.fetch_add(1, Ordering::SeqCst);
        *seen.waker.lock().unwrap() = Some(cx.waker().clone());
        if seen.ready.load(Ordering::SeqCst) { Poll::Ready(()) } else { Poll::Pending }
    }
}
fn pause() -> (Pause, Arc<Seen>) {
    let seen = Arc::new(Seen::default());
    (Pause { seen: seen.clone(), _pinned: PhantomPinned }, seen)
}
#[derive(Default)]
struct Wakes(AtomicUsize);
impl Wake for Wakes {
    fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
    fn wake_by_ref(self: &Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
}
fn waker() -> (Arc<Wakes>, Waker) {
    let seen = Arc::new(Wakes::default());
    (seen.clone(), Waker::from(seen))
}
fn poll_once(future: &mut Handoff, waker: &Waker) -> Poll<Vec<String>> {
    future.as_mut().poll(&mut Context::from_waker(waker))
}
fn ready(mut future: Handoff) -> Vec<String> {
    let (_, waker) = waker();
    match poll_once(&mut future, &waker) {
        Poll::Ready(lines) => lines,
        Poll::Pending => panic!("ready pause unexpectedly pending"),
    }
}
struct NonClone(String);
impl NonClone {
    fn render(&self, record: &str) -> String { format!("{}{}", record, self.0) }
}
#[test]
fn preparation_is_synchronous_and_exactly_once() {
    let future = {
        let records = vec![String::from("a"), String::from("b")];
        let calls = Rc::new(RefCell::new(Vec::<String>::new()));
        let token = NonClone(String::from("<"));
        let prefix = &token.0;
        let captured = calls.clone();
        let future = prepare_handoff(&records, move |record| {
            captured.borrow_mut().push(record.to_owned());
            format!("{}{}>", prefix, record)
        }, std::future::ready(()));
        assert_eq!(*calls.borrow(), vec!["a", "b"]);
        future
    };
    assert_eq!(ready(future), vec!["<a>", "<b>"]);
    // The callback itself owns a genuinely non-Clone capture.
    let token = NonClone(String::from("!"));
    let future = prepare_handoff(&[String::from("x")], move |record| token.render(record), std::future::ready(()));
    assert_eq!(ready(future), vec!["x!"]);
}
#[test]
fn prepared_outputs_preserve_order_and_values() {
    let records = vec![String::from("żółw"), String::new(), String::from("żółw"), String::from("end")];
    let mut index = 0;
    let future = prepare_handoff(&records, |record| {
        index += 1;
        match index { 1 => String::from("Ω"), 2 => String::new(), 3 => String::from("Ω"), _ => format!("{}!", record) }
    }, std::future::ready(()));
    assert_eq!(ready(future), vec!["Ω", "", "Ω", "end!"]);
    assert_eq!(index, 4);
}
#[test]
fn pause_retains_owned_state_and_current_waker() {
    let (pause, seen) = pause();
    let calls = Rc::new(RefCell::new(Vec::<String>::new()));
    let mut future = {
        let records = vec![String::from("one"), String::from("two")];
        let captured = calls.clone();
        prepare_handoff(&records, move |record| {
            captured.borrow_mut().push(record.to_owned()); format!("[{}]", record)
        }, pause)
    };
    assert_eq!(*calls.borrow(), vec!["one", "two"]);
    let (first, first_waker) = waker();
    assert!(poll_once(&mut future, &first_waker).is_pending());
    assert!(seen.waker.lock().unwrap().as_ref().unwrap().will_wake(&first_waker));
    let (second, second_waker) = waker();
    assert!(poll_once(&mut future, &second_waker).is_pending());
    assert_eq!(seen.polls.load(Ordering::SeqCst), 2);
    assert!(seen.waker.lock().unwrap().as_ref().unwrap().will_wake(&second_waker));
    assert_eq!(*calls.borrow(), vec!["one", "two"]);
    seen.ready.store(true, Ordering::SeqCst);
    seen.waker.lock().unwrap().take().unwrap().wake();
    assert_eq!(first.0.load(Ordering::SeqCst), 0);
    assert_eq!(second.0.load(Ordering::SeqCst), 1);
    assert_eq!(poll_once(&mut future, &second_waker), Poll::Ready(vec![String::from("[one]"), String::from("[two]")]));
    assert_eq!(seen.polls.load(Ordering::SeqCst), 3);
    assert_eq!(*calls.borrow(), vec!["one", "two"]);
}
#[test]
fn empty_records_still_wait_for_pause() {
    let (pause, seen) = pause();
    let mut calls = 0;
    let mut future = prepare_handoff(&[], |_| { calls += 1; String::from("unexpected") }, pause);
    assert_eq!(calls, 0);
    let (_, waker) = waker();
    assert!(poll_once(&mut future, &waker).is_pending());
    assert!(poll_once(&mut future, &waker).is_pending());
    assert_eq!(seen.polls.load(Ordering::SeqCst), 2);
    seen.ready.store(true, Ordering::SeqCst);
    seen.waker.lock().unwrap().take().unwrap().wake();
    assert_eq!(poll_once(&mut future, &waker), Poll::Ready(Vec::new()));
    assert_eq!(calls, 0);
}
#[test]
fn dropping_unpolled_preserves_preparation_effects() {
    let records = vec![String::from("saved")];
    let calls = Rc::new(RefCell::new(Vec::<String>::new()));
    let captured = calls.clone();
    let (pause, seen) = pause();
    let future = prepare_handoff(&records, move |record| { captured.borrow_mut().push(record.to_owned()); record.to_owned() }, pause);
    assert_eq!(*calls.borrow(), vec!["saved"]);
    drop(future);
    assert_eq!(*calls.borrow(), vec!["saved"]);
    assert_eq!(seen.polls.load(Ordering::SeqCst), 0);
}
#[test]
fn dropping_pending_preserves_preparation_effects() {
    let records = vec![String::from("saved")];
    let calls = Rc::new(RefCell::new(Vec::<String>::new()));
    let captured = calls.clone();
    let (pause, seen) = pause();
    let mut future = prepare_handoff(&records, move |record| { captured.borrow_mut().push(record.to_owned()); record.to_owned() }, pause);
    let (_, waker) = waker();
    assert!(poll_once(&mut future, &waker).is_pending());
    drop(future);
    assert_eq!(*calls.borrow(), vec!["saved"]);
    assert_eq!(seen.polls.load(Ordering::SeqCst), 1);
}
#[test]
fn independent_calls_have_no_shared_progress() {
    for record in ["first", "second"] {
        let mut calls = 0;
        let result = ready(prepare_handoff(&[record.to_owned()], |value| { calls += 1; format!("{}?", value) }, std::future::ready(())));
        assert_eq!(result, vec![format!("{}?", record)]);
        assert_eq!(calls, 1);
    }
}
`;

export const sendHandoffModelStep: LessonStep = {
  id: "async-lending-send-boundary-handoff-model",
  kind: "predict",
  title: "Co zostaje w zawieszonym zadaniu?",
  prompt:
    "prepare_handoff ma przyjmować formatter z lokalnym Rc i zwracać Send + 'static. Kiedy trzeba wywołać formatter? Box posiada future na stercie; dyn Future określa wymazany interfejs i Output. Pin chroni przypiętą wartość future przed przeniesieniem przez ten uchwyt, także gdy pause jest !Unpin. Można przenieść uchwyt Box bez przeniesienia jego przypiętego obiektu. Pudełko, owned String i dynamiczne wywołanie mają koszt; ta gotowa sygnatura jest rusztowaniem dla ćwiczenia własności, nie zadaniem zaprojektowania adaptera dyn.",
  choices: [
    {
      id: "prepare",
      label:
        "Synchronicznie przed zwróceniem future; zadanie zachowa owned wyniki i pause.",
    },
    {
      id: "defer",
      label: "Dopiero po pause.await; async move zmieni Rc na Send.",
    },
  ],
  evaluator: {
    kind: "choice",
    correct: "prepare",
    explanations: {
      prepare:
        "Formatter wykonuje lokalne efekty już podczas wywołania funkcji. Future przechowuje owned Vec<String> i Send + 'static pause, a nie formatter ani pożyczone records. Send i 'static opisują zachowany stan. Drop zadania nie cofa przygotowania.",
      defer:
        "async move przenosi własność, ale nie zmienia Rc w Send. Zachowanie dowolnego F w zwracanym Send future nie kompiluje się przy tej sygnaturze. Najpierw przygotuj owned wyniki poza async, dopiero potem czekaj.",
    },
  },
  evidenceKind: "prediction",
  evidence: { version: 2, conceptIds: ["async-lending-send-boundary"] },
};

export const sendTransferStep: LessonStep = {
  id: "async-lending-send-boundary-prepared-handoff",
  kind: "apply",
  title: "Przygotuj lokalnie, przekaż po zawieszeniu",
  prompt:
    "Zaimplementuj podaną sygnaturę prepare_handoff<F, P>(records: &[String], format: F, pause: P) -> Pin<Box<dyn Future<Output = Vec<String>> + Send + 'static>>, gdzie F: FnMut(&str) -> String, P: Future<Output = ()> + Send + 'static. Przy wywołaniu funkcji formatter ma wykonać się dokładnie raz dla każdego rekordu, w kolejności, i zwrócić owned String zachowane bez zmian (także puste, Unicode i duplikaty). Nie dodawaj F: Send, F: 'static ani Clone/Unpin: formatter może pożyczać lokalny stan i posiadać Rc; pause może być !Unpin i nie-Clone. Zwrócony future czeka na rzeczywiste Ready od pause, również dla pustych records, które nie wywołują formattera. Podczas Pending nie formatuj ponownie. Właściciele wejścia i przechwyceń mogą zniknąć przed poll/spawn. Drop przed poll lub podczas Pending porzuca owned wynik, ale nie cofa efektów przygotowania. Nie pollujemy po Ready. Box i owned teksty mogą alokować; nie obiecujemy braku alokacji. To osobna rodzina transferu, nie alias dawnego owned_report. Możesz zrobić przerwę po modelu i wrócić do implementacji później.",
  code: `${signature}{
    // TODO: zachowaj wynik formattera zamiast kopiować samo wejście.
    let prepared = records.to_vec();
    let _ = &mut format;
    Box::pin(async move { pause.await; prepared })
}
`,
  expectedStatus: "success",
  solution: sendTransferSolution,
  evaluator: { kind: "tests", tests: sendTransferTests },
  hints: [
    "Zbuduj Vec<String> przez lokalne wywołania formattera przed stworzeniem async move.",
    "Przenieś tylko przygotowane wyniki i pause. Awaituj pause również przy zerowej liczbie rekordów; nie dodawaj boundów do formattera.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["async-lending-send-boundary"],
    codingTaskId: "async-lending/send-prepared-handoff-v1",
  },
};

export const sendTransferMutants: readonly {
  id: string;
  source: string;
  testName: string;
}[] = [
  {
    id: "duplicate-format",
    source: sendTransferSolution.replace(
      "prepared.push(format(record));",
      "let _ = format(record); prepared.push(format(record));",
    ),
    testName: "preparation_is_synchronous_and_exactly_once",
  },
  {
    id: "first-record-only",
    source: sendTransferSolution.replace(
      "for record in records",
      "for record in records.iter().take(1)",
    ),
    testName: "preparation_is_synchronous_and_exactly_once",
  },
  {
    id: "reversed-output",
    source: sendTransferSolution.replace(
      awaitOutput,
      "    prepared.reverse();\n" + awaitOutput,
    ),
    testName: "prepared_outputs_preserve_order_and_values",
  },
  {
    id: "ignore-pause",
    source: sendTransferSolution.replace(
      "pause.await; prepared",
      "let _ = pause; prepared",
    ),
    testName: "pause_retains_owned_state_and_current_waker",
  },
  {
    id: "empty-input-pause-bypass",
    source: sendTransferSolution.replace(
      "pause.await; prepared",
      "if !prepared.is_empty() { pause.await; } prepared",
    ),
    testName: "empty_records_still_wait_for_pause",
  },
  {
    id: "empty-output",
    source: sendTransferSolution.replace(
      "pause.await; prepared",
      "pause.await; let _ = prepared; Vec::new()",
    ),
    testName: "prepared_outputs_preserve_order_and_values",
  },
  {
    id: "raw-input-output",
    source: sendTransferSolution.replace(
      "prepared.push(format(record));",
      "let _ = format(record); prepared.push(record.clone());",
    ),
    testName: "prepared_outputs_preserve_order_and_values",
  },
].map((mutant) => ({
  ...mutant,
  testName: `__rust_workshop_hidden_tests::${mutant.testName}`,
}));

const passWitness = `
#[test]
fn local_preparation_survives_owners() {
    let future = {
        let records = vec![String::from("local")];
        let log = std::rc::Rc::new(std::cell::RefCell::new(Vec::new()));
        let prefix = String::from("owned:");
        let future = prepare_handoff(&records, |record| {
            log.borrow_mut().push(record.to_owned()); format!("{}{}", prefix, record)
        }, std::future::ready(()));
        assert_eq!(*log.borrow(), vec!["local"]);
        future
    };
    let waker = std::task::Waker::from(std::sync::Arc::new(WitnessWake));
    let mut context = std::task::Context::from_waker(&waker);
    let mut future = future;
    assert_eq!(future.as_mut().poll(&mut context), std::task::Poll::Ready(vec![String::from("owned:local")]));
}
struct WitnessWake;
impl std::task::Wake for WitnessWake { fn wake(self: std::sync::Arc<Self>) {} }
`;
export const sendTransferBoundaries = [
  {
    id: "generic-deferred-formatter",
    failSuffix: `
fn forbidden_generic<F, P>(records: &[String], mut format: F, pause: P)
    -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<String>> + Send + 'static>>
where F: FnMut(&str) -> String, P: std::future::Future<Output = ()> + Send + 'static {
    let owned = records.to_vec();
    Box::pin(async move { pause.await; owned.iter().map(|record| format(record)).collect() })
}
fn concrete_send_client() { let _ = forbidden_generic(&[], |value| value.to_owned(), std::future::ready(())); }
`,
    diagnosticCodes: [] as string[],
    diagnosticMessage: "future cannot be sent between threads safely",
    primaryMarker: "Box::pin(async move { pause.await; owned.iter()",
  },
  {
    id: "rc-across-await",
    failSuffix: `
fn forbidden_rc() -> std::pin::Pin<Box<dyn std::future::Future<Output = usize> + Send + 'static>> {
    let local = std::rc::Rc::new(String::from("local"));
    Box::pin(async move { std::future::ready(()).await; local.len() })
}
`,
    diagnosticCodes: [] as string[],
    diagnosticMessage: "future cannot be sent between threads safely",
    primaryMarker:
      "Box::pin(async move { std::future::ready(()).await; local.len() })",
  },
  {
    id: "borrowed-input-static",
    failSuffix: `
fn forbidden_input(records: &[String]) -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<String>> + Send + 'static>> {
    Box::pin(async move { std::future::ready(()).await; records.to_vec() })
}
`,
    diagnosticCodes: [] as string[],
    diagnosticMessage: "lifetime may not live long enough",
    primaryMarker:
      "Box::pin(async move { std::future::ready(()).await; records.to_vec() })",
  },
  {
    id: "borrowed-formatter-static",
    failSuffix: `
fn require_static<F: FnMut(&str) -> String + 'static>(_: F) {}
fn forbidden_formatter() {
    let prefix = String::from("local");
    require_static(|record| format!("{}{}", prefix, record));
}
`,
    diagnosticCodes: ["E0373"],
    diagnosticMessage: "closure may outlive the current function",
    primaryMarker: '|record| format!("{}{}", prefix, record)',
  },
].map((boundary) => ({
  ...boundary,
  passSuffix: passWitness,
  passTestName: "local_preparation_survives_owners",
}));

export const sendTransferTokioTests = `
#[tokio::test(flavor = "current_thread")]
async fn prepared_handoff_crosses_real_tokio_spawn_after_pending() {
    let (polled_tx, polled_rx) = tokio::sync::oneshot::channel();
    let (permission_tx, permission_rx) = tokio::sync::oneshot::channel::<()>();
    let pause = async move {
        polled_tx.send(()).expect("test owns poll observer");
        permission_rx.await.expect("test releases permission");
    };
    let future = {
        let records = vec![String::from("żółw"), String::new(), String::from("żółw")];
        let log = std::rc::Rc::new(std::cell::RefCell::new(Vec::new()));
        let prefix = String::from("ready:");
        let future = prepare_handoff(&records, |record| {
            log.borrow_mut().push(record.to_owned()); format!("{}{}", prefix, record)
        }, pause);
        assert_eq!(*log.borrow(), vec!["żółw", "", "żółw"]);
        future
    };
    let handle = tokio::spawn(future);
    polled_rx.await.expect("pause actually polled before observation");
    assert!(!handle.is_finished());
    permission_tx.send(()).expect("task still waits for permission");
    assert_eq!(handle.await.expect("join owned handoff"), vec!["ready:żółw", "ready:", "ready:żółw"]);
}
`;
