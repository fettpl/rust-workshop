import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";

const reviewedAt = "2026-09-19";

export const asyncLendingCoreSources: Source[] = [
  {
    id: "async-lending-core-future",
    title: "Rust standard library: Future",
    url: "https://doc.rust-lang.org/std/future/trait.Future.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontrolowanego Pending/Ready lub ponownego poll.",
  },
  {
    id: "async-lending-core-async-fn",
    title: "Rust Reference: async functions and closures",
    url: "https://doc.rust-lang.org/reference/expressions/block-expr.html#async-blocks",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przykładów pożyczonych argumentów callbacku.",
  },
  {
    id: "async-lending-core-gat",
    title: "Rust Reference: associated items",
    url: "https://doc.rust-lang.org/reference/items/associated-items.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie rodzin typów zależnych od lifetime.",
  },
];

export const asyncLendingCoreCompetencies: Competency[] = [
  {
    id: "async-lending-receiver-contract",
    title:
      "Łączysz borrowed result z konkretnym wywołaniem receivera i kontrolowanym Pending.",
  },
  {
    id: "async-lending-sequential-callback",
    title:
      "Uruchamiasz callback AsyncFnMut sekwencyjnie i kończysz pożyczkę przed kolejnym odpytywaniem.",
  },
];

export const asyncLendingCoreConcepts: Concept[] = [
  {
    id: "async-lending-borrowed-readiness",
    title: "Gotowość borrowed future nie przesuwa własności",
    prerequisites: ["future-laziness", "gat-receiver-borrows"],
    competencyIds: ["async-lending-receiver-contract"],
    reviewPrompt:
      "Co musi trwać do chwili użycia pożyczonego wyniku i co powinno zostać osobnym krokiem?",
    reviewAnswer:
      "Receiver i jego dane muszą żyć tak długo, jak wynik; odczyt, callback i commit postępu to osobne punkty kontraktu.",
    distinguish:
      "Pending nie oddaje danych, a Ready nie oznacza automatycznego commit. Borrowed result nie może stać się niezależnym owned raportem bez jawnego kopiowania lub przeniesienia.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "async-lending-callback-borrow",
    title: "AsyncFnMut może pożyczyć argument tylko na czas wywołania",
    prerequisites: [
      "async-lending-borrowed-readiness",
      "hrtb-borrowed-projections",
    ],
    competencyIds: ["async-lending-sequential-callback"],
    reviewPrompt:
      "Dlaczego callback powinien być awaitowany przed kolejnym borrowed receive?",
    reviewAnswer:
      "Jego future może przechowywać referencję do argumentu lub stanu callbacku; zakończenie await jest granicą, po której można zwolnić pożyczkę i odpytać źródło.",
    distinguish:
      "Sekwencyjne await nie wymaga 'static ani klonowania argumentu. Spawn niezależnego owned future ma inną granicę i osobne wymagania Send + 'static.",
    evidenceArtifact: "rust-code",
  },
];

const coreEvidenceFamilies: Record<string, string> = {
  "async-lending-receiver": "async-lending/receiver-lease-v1",
  "async-lending-callbacks": "async-lending/sequential-callback-v1",
};

for (const concept of asyncLendingCoreConcepts) {
  concept.evidenceCalibration = { version: 2, minimumCodingTasks: 2 };
}

function coding(options: {
  id: string;
  kind: "debug" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "fix",
    evidenceGate: true,
  };
}

const blockOn = `
fn block_on<F: std::future::Future>(mut future: F) -> F::Output {
    use std::task::{Context, Poll, Wake, Waker};
    use std::sync::Arc;
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let waker = Waker::from(Arc::new(Noop));
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    for _ in 0..32 { if let Poll::Ready(value) = future.as_mut().poll(&mut cx) { return value; } }
    panic!("future exceeded the bounded poll budget")
}
`;

const receiverSolution = `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct Receiver { packets: Vec<Vec<u8>>, cursor: usize, pending: bool }
struct Borrowed<'a> { receiver: Option<&'a mut Receiver>, index: usize }
struct Receive<'a> { receiver: Option<&'a mut Receiver>, pending: bool }

impl Receiver {
    fn new(packets: Vec<Vec<u8>>) -> Self { Self { packets, cursor: 0, pending: true } }
    fn receive(&mut self) -> Receive<'_> {
        let pending = self.pending; self.pending = false;
        Receive { receiver: Some(self), pending }
    }
}
impl<'a> Future for Receive<'a> {
    type Output = Option<Borrowed<'a>>;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.get_mut();
        if this.pending { this.pending = false; cx.waker().wake_by_ref(); return Poll::Pending; }
        let receiver = this.receiver.take().unwrap();
        if receiver.cursor < receiver.packets.len() {
            let index = receiver.cursor;
            Poll::Ready(Some(Borrowed { receiver: Some(receiver), index }))
        } else { Poll::Ready(None) }
    }
}
impl Borrowed<'_> {
    fn bytes(&self) -> &[u8] { &self.receiver.as_ref().unwrap().packets[self.index] }
    fn finish(mut self) { let receiver = self.receiver.take().unwrap(); receiver.cursor += 1; }
}
`;

const receiverStarter = receiverSolution.replace(
  "let receiver = this.receiver.take().unwrap();",
  'let receiver = this.receiver.take().unwrap();\n        todo!("return a borrowed packet");',
);
const receiverTests = `${blockOn}
#[test]
fn pending_then_ready_keeps_data_and_exhaustion() {
    let mut receiver = Receiver::new(vec!["żółć".as_bytes().to_vec()]);
    let first = block_on(receiver.receive()).unwrap();
    assert_eq!(first.bytes(), "żółć".as_bytes());
    first.finish();
    assert!(block_on(receiver.receive()).is_none());
}
#[test]
fn the_next_borrow_starts_only_after_the_first_is_finished() {
    let mut receiver = Receiver::new(vec![b"a".to_vec(), b"b".to_vec()]);
    let first = block_on(receiver.receive()).unwrap();
    assert_eq!(first.bytes(), b"a");
    first.finish();
    let second = block_on(receiver.receive()).unwrap();
    assert_eq!(second.bytes(), b"b");
}
`;

const callbackSolution = `struct Source { values: Vec<Vec<u8>>, cursor: usize }
struct Lease<'a> { source: &'a mut Source, index: usize }

impl Source {
    fn new(values: Vec<Vec<u8>>) -> Self { Self { values, cursor: 0 } }
    fn receive(&mut self) -> Option<Lease<'_>> {
        let index = self.cursor;
        self.values.get(index)?;
        Some(Lease { source: self, index })
    }
}
impl Lease<'_> {
    fn bytes(&self) -> &[u8] { &self.source.values[self.index] }
    fn commit(self) { self.source.cursor += 1; }
}

async fn run_sequential<F, E>(source: &mut Source, mut callback: F) -> Result<usize, E>
where F: AsyncFnMut(&[u8]) -> Result<(), E>
{
    let mut visited = 0;
    while let Some(lease) = source.receive() {
        visited += 1;
        callback(lease.bytes()).await?;
        lease.commit();
    }
    Ok(visited)
}
`;
const callbackStarter = callbackSolution.replace(
  "callback(lease.bytes()).await?;",
  'todo!("await a borrowed callback");',
);
const callbackTests = `${blockOn}
#[test]
fn callback_preserves_order_and_stops_on_error() {
    let mut source = Source::new(vec![b"a".to_vec(), b"b".to_vec(), b"c".to_vec()]);
    let mut seen = Vec::new();
    let result = block_on(run_sequential(&mut source, async |value| {
        seen.push(value[0]);
        if value == b"b" { Err("stop") } else { Ok(()) }
    }));
    assert_eq!(result, Err("stop"));
    assert_eq!(seen, vec![b'a', b'b']);
    assert_eq!(source.cursor, 1);
}
#[test]
fn callback_can_mutate_local_accumulator_without_cloning_input() {
    let mut source = Source::new(vec![b"ab".to_vec(), b"c".to_vec()]);
    let mut total = 0;
    assert_eq!(block_on(run_sequential(&mut source, async |value| {
        total += value.len();
        Ok::<(), ()>(())
    })), Ok(2));
    assert_eq!(total, 3);
}
`;

export const asyncLendingCoreLessons: Lesson[] = [
  {
    id: "async-lending-receiver",
    moduleId: "async-lending-contracts",
    conceptIds: ["async-lending-borrowed-readiness"],
    competencyIds: ["async-lending-receiver-contract"],
    prerequisites: ["future-ownership", "gat-receiver-borrows"],
    title: "Receiver pożyczonego wyniku",
    subtitle: "Pending nie kończy pożyczki ani nie przesuwa kursora",
    minutes: 18,
    outcomes: [
      "zwiążesz wynik z wywołaniem receivera",
      "rozróżnisz Pending, Ready i finish",
    ],
    steps: [
      {
        id: "async-lending-receiver-predict",
        kind: "predict",
        title: "Przewiduj Pending",
        prompt: "Czy Pending przesuwa kursor?",
        choices: [
          { id: "no", label: "Nie" },
          { id: "yes", label: "Tak" },
        ],
        evaluator: {
          kind: "choice",
          correct: "no",
          explanations: {
            no: "Pending nie oddaje wyniku ani nie zatwierdza postępu.",
            yes: "Pending sygnalizuje brak gotowego wyniku.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "async-lending-receiver-explain",
        kind: "explain",
        title: "Zwiąż wynik z wywołaniem",
        prompt: "Wskaż właściciela pożyczki.",
        explanation:
          "Future przechowuje wyłączną pożyczkę receivera aż do Ready lub Drop.",
        evaluator: {
          kind: "answer",
          accepted: ["Future przechowuje receiver.", "future"],
          feedback: "Pożyczka należy do future do czasu Ready lub Drop.",
        },
        evidenceKind: "exposure",
      },
      coding({
        id: "async-lending-receiver-gate",
        kind: "debug",
        title: "Napraw borrowed receive",
        prompt:
          "Zachowaj dane przy Pending, zwróć wynik związany z receiverem i przesuń kursor dopiero po finish. Gate i blank są dwiema formami tego samego kontraktu i dzielą jedną rodzinę dowodu.",
        code: receiverStarter,
        solution: receiverSolution,
        tests: receiverTests,
        hints: [
          "Future może oddać Pending dokładnie raz i obudzić bieżący task.",
          "Nie przesuwaj kursora przy tworzeniu wyniku; finish jest osobną granicą.",
        ],
      }),
      coding({
        id: "async-lending-receiver-blank",
        kind: "blank",
        title: "Zaprojektuj drugie odczytanie",
        prompt:
          "Napisz receiver, który po kontrolowanym Pending oddaje rekord pożyczony na czas wywołania. Zachowaj pełny publiczny kontrakt Receiver::new, receive, Borrowed::bytes i Borrowed::finish; blank jest drugą formą tego samego zadania, bez nowej rodziny.",
        solution: receiverSolution,
        tests: receiverTests,
        hints: [
          "Przechowaj &mut Receiver w future.",
          "Po drop wyniku kolejny receive może użyć danych.",
        ],
      }),
      {
        id: "async-lending-receiver-recall",
        kind: "recall",
        title: "Przypomnij granicę",
        prompt: "Kiedy wolno rozpocząć drugi borrowed receive?",
        evaluator: {
          kind: "answer",
          accepted: [
            "Po zakończeniu pierwszej pożyczki.",
            "po drop lub finish",
          ],
          feedback: "Druga pożyczka nie może nakładać się z pierwszą.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "Ready automatycznie zatwierdza kursor",
      "borrowed wynik można zachować po receiverze",
    ],
    transferTask:
      "Przenieś granicę finish do API pakietu i zapisz, które efekty zostają po anulowaniu.",
    evidenceGate:
      "Udowodnij kontrolowane Pending, integralność danych, wyczerpanie i brak drugiej żywej pożyczki.",
    sourceIds: asyncLendingCoreSources.map((source) => source.id),
  },
  {
    id: "async-lending-callbacks",
    moduleId: "async-lending-contracts",
    conceptIds: ["async-lending-callback-borrow"],
    competencyIds: ["async-lending-sequential-callback"],
    prerequisites: ["async-lending-receiver"],
    title: "Sekwencyjny callback pożyczający argument",
    subtitle: "Callback może awaitować lokalny widok i zatrzymać źródło",
    minutes: 18,
    outcomes: [
      "zachowasz kolejność wywołań",
      "przerwiesz po błędzie bez 'static ani klonowania",
    ],
    steps: [
      {
        id: "async-lending-callbacks-predict",
        kind: "predict",
        title: "Przewiduj kolejność",
        prompt: "Czy drugi callback zacznie się przed Ready pierwszego?",
        choices: [
          { id: "no", label: "Nie" },
          { id: "yes", label: "Tak" },
        ],
        evaluator: {
          kind: "choice",
          correct: "no",
          explanations: {
            no: "Sekwencyjny await kończy pierwszą pożyczkę przed kolejną.",
            yes: "To wymagałoby osobnego spawnowania.",
          },
        },
        evidenceKind: "prediction",
      },
      {
        id: "async-lending-callbacks-explain",
        kind: "explain",
        title: "Pożyczka callbacku",
        prompt: "Co może przechowywać future callbacku?",
        explanation:
          "Referencję do argumentu lub do lokalnego stanu callbacku.",
        evaluator: {
          kind: "answer",
          accepted: ["Referencję do argumentu.", "lokalną referencję"],
          feedback: "Future callbacku może pożyczać argument i stan.",
        },
        evidenceKind: "exposure",
      },
      coding({
        id: "async-lending-callbacks-gate",
        kind: "debug",
        title: "Zatrzymaj po błędzie",
        prompt:
          "Napraw pętlę tak, aby callback otrzymywał lokalny widok, mutował akumulator i przerywał po pierwszym błędzie. Gate i blank sprawdzają jedną rodzinę kontraktu sekwencyjnego callbacku.",
        code: callbackStarter,
        solution: callbackSolution,
        tests: callbackTests,
        hints: [
          "Operator ? kończy funkcję natychmiast.",
          "Pożyczka argumentu trwa przez callback, a nie przez całą kolekcję.",
        ],
      }),
      coding({
        id: "async-lending-callbacks-blank",
        kind: "blank",
        title: "Zbuduj visitor",
        prompt:
          "Zaimplementuj sekwencyjnego visitora z callbackiem działającym dla każdej lokalnej pożyczki. Zachowaj granicę await przed kolejnym receive; blank nie tworzy świeżej rodziny dowodu.",
        solution: callbackSolution,
        tests: callbackTests,
        hints: [
          "Użyj for<'a> przy callbacku.",
          "Nie wymagaj przechowywania argumentu ani 'static.",
        ],
      }),
      {
        id: "async-lending-callbacks-recall",
        kind: "recall",
        title: "Przypomnij zatrzymanie",
        prompt: "Co robi pierwszy błąd callbacku?",
        evaluator: {
          kind: "answer",
          accepted: ["Kończy wizytę.", "zatrzymuje pętlę"],
          feedback: "Błąd nie może zostać pominięty.",
        },
        evidenceKind: "recall",
      },
    ],
    misconceptions: [
      "sekwencyjny callback musi klonować bytes",
      "async callback oznacza automatyczny spawn",
    ],
    transferTask:
      "Porównaj callback pożyczający dane z owned producerem wysyłanym do Tokio.",
    evidenceGate:
      "Udowodnij kolejność, lokalny akumulator i zatrzymanie po błędzie.",
    sourceIds: asyncLendingCoreSources.map((source) => source.id),
  },
];

for (const lesson of asyncLendingCoreLessons) {
  const family = coreEvidenceFamilies[lesson.id];
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

const receiverReviewSolution =
  receiverSolution.replace(
    "let pending = self.pending; self.pending = false;",
    "let pending = std::mem::replace(&mut self.pending, false);",
  ) +
  `
fn bounded_poll<F: std::future::Future>(future: F) -> F::Output {
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    struct Noop;
    impl Wake for Noop { fn wake(self: Arc<Self>) {} }
    let waker = Waker::from(Arc::new(Noop));
    let mut cx = Context::from_waker(&waker);
    let mut future = Box::pin(future);
    for _ in 0..32 {
        if let Poll::Ready(value) = future.as_mut().poll(&mut cx) { return value; }
    }
    panic!("review future exceeded the bounded poll budget")
}
fn replay_uncommitted(receiver: &mut Receiver) -> Vec<u8> {
    let packet = bounded_poll(receiver.receive()).unwrap();
    let bytes = packet.bytes().to_vec();
    drop(packet);
    bytes
}
`;
const receiverReviewTests = `${receiverTests}
#[test]
fn replay_uncommitted_preserves_the_same_packet() {
    let mut receiver = Receiver::new(vec![b"review".to_vec()]);
    let first = block_on(receiver.receive()).unwrap();
    assert_eq!(first.bytes(), b"review");
    drop(first);
    assert_eq!(replay_uncommitted(&mut receiver), b"review");
}
`;
const callbackReviewSolution =
  callbackSolution.replace(
    "while let Some(lease) = source.receive() {",
    "loop {\n        let Some(lease) = source.receive() else { break };",
  ) +
  `
async fn collect_with_count(source: &mut Source) -> (usize, Vec<u8>) {
    let mut count = 0;
    let mut collected = Vec::new();
    let _ = run_sequential(source, async |value| {
        count += 1;
        collected.extend_from_slice(value);
        Ok::<(), ()>(())
    }).await;
    (count, collected)
}
`;
const callbackReviewTests = `${callbackTests}
#[test]
fn collect_with_count_awaits_a_borrowed_callback() {
    let mut source = Source::new(vec![b"xy".to_vec()]);
    let mut observed = Vec::new();
    let (count, collected) = block_on(collect_with_count(&mut source));
    observed.extend_from_slice(&collected);
    assert_eq!(count, 1);
    assert_eq!(observed, b"xy");
    assert_eq!(source.cursor, 1);
}
`;

export const asyncLendingCoreReviewExercises: Record<string, LessonStep> = {
  "async-lending-borrowed-readiness": {
    id: "async-lending-receiver-review",
    kind: "blank",
    title: "Powtórka receivera",
    prompt:
      "Zaimplementuj dokładnie `fn replay_uncommitted(receiver: &mut Receiver) -> Vec<u8>`: odczytaj rekord, porzuć lease bez commit i zwróć jego kopię przy ponownej próbie.",
    solution: receiverReviewSolution,
    evaluator: { kind: "tests", tests: receiverReviewTests },
    hints: ["Borrowed wynik powinien znać źródło.", "Testuj pustkę po commit."],
    evidenceKind: "recall",
  },
  "async-lending-callback-borrow": {
    id: "async-lending-callbacks-review",
    kind: "blank",
    title: "Powtórka callbacku",
    prompt:
      "Zaimplementuj dokładnie `async fn collect_with_count(source: &mut Source) -> (usize, Vec<u8>)`: odwiedzaj sekwencyjnie, awaituj borrowed callback i zwróć liczbę oraz zebrane bajty.",
    solution: callbackReviewSolution,
    evaluator: { kind: "tests", tests: callbackReviewTests },
    hints: ["Callback przyjmuje lokalną pożyczkę.", "Błąd kończy pętlę."],
    evidenceKind: "recall",
  },
};

for (const [conceptId, review] of Object.entries(
  asyncLendingCoreReviewExercises,
)) {
  review.evidence = {
    version: 2,
    conceptIds: [conceptId],
    codingTaskId: `review/${review.id}-v1`,
  };
}
