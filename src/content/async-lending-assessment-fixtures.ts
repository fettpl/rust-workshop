import {
  asyncLendingCoreLessons,
  asyncLendingCoreReviewExercises,
} from "./async-lending-core";
import {
  asyncLendingBoundaryLessons,
  asyncLendingBoundaryReviewExercises,
} from "./async-lending-boundaries";

export interface AsyncLendingAssessmentFixture {
  id: string;
  equivalent: string;
  mutant: string;
  mutants?: string[];
}

const assessments = [
  ...asyncLendingCoreLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...asyncLendingBoundaryLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(asyncLendingCoreReviewExercises),
  ...Object.values(asyncLendingBoundaryReviewExercises),
];

function mutate(id: string, solution: string): string {
  if (id === "async-lending-receiver-bounded-batch")
    return solution.replace(
      "let len = this.limit.min(receiver.packets.len() - start);",
      "let len = this.limit.min(receiver.packets.len() - start);\n        receiver.cursor += len;",
    );
  if (id.includes("receiver"))
    return solution.replace("receiver.cursor += 1", "receiver.cursor += 0");
  if (id.includes("callbacks"))
    return solution.replace(
      "callback(lease.bytes()).await?;",
      "let _ = lease.bytes();",
    );
  if (id.includes("cancel-commit"))
    return solution
      .replace("if cancel {", "if false {")
      .replace("if matches!(cancel, true) {", "if false {")
      .replace("if cancel == true {", "if false {");
  if (id.includes("send-boundary"))
    return solution
      .replace("OwnedReport { bytes }", "OwnedReport { bytes: Vec::new() }")
      .replace(
        "OwnedReport { bytes: owned }",
        "OwnedReport { bytes: Vec::new() }",
      );
  return solution.replace(
    "Some(Report(self.bytes.to_vec()))",
    "Some(Report(Vec::new()))",
  );
}

function batchFinishMutant(solution: string): string {
  return solution.replace(
    "receiver.cursor += self.len;",
    "receiver.cursor += 1;",
  );
}

function replaceFunctionBody(
  source: string,
  signature: string,
  body: string,
): string {
  const signatureStart = source.indexOf(signature);
  if (signatureStart < 0)
    throw new Error(`Missing equivalent API: ${signature}`);
  const opening = source.indexOf("{", signatureStart + signature.length);
  if (opening < 0) throw new Error(`Missing function body: ${signature}`);
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return `${source.slice(0, opening)}{\n${body}\n}${source.slice(index + 1)}`;
      }
    }
  }
  throw new Error(`Unclosed function body: ${signature}`);
}

function equivalent(id: string, solution: string): string {
  if (id === "async-lending-receiver-bounded-batch")
    return solution.replaceAll("cursor", "committed");
  if (id === "async-lending-receiver-review")
    return replaceFunctionBody(
      solution,
      "fn replay_uncommitted(receiver: &mut Receiver) -> Vec<u8>",
      `use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};

    struct EquivalentNoop;
    impl Wake for EquivalentNoop {
        fn wake(self: Arc<Self>) {}
    }

    let waker = Waker::from(Arc::new(EquivalentNoop));
    let mut context = Context::from_waker(&waker);
    let mut receive = Box::pin(receiver.receive());
    for _ in 0..32 {
        match receive.as_mut().poll(&mut context) {
            Poll::Ready(Some(packet)) => {
                let bytes = packet.bytes().to_vec();
                drop(packet);
                return bytes;
            }
            Poll::Ready(None) => panic!("receiver exhausted during bounded retry"),
            Poll::Pending => {}
        }
    }
    panic!("receiver future exceeded the bounded poll budget")`,
    );
  if (id === "async-lending-callbacks-review")
    return replaceFunctionBody(
      solution,
      "async fn collect_with_count(source: &mut Source) -> (usize, Vec<u8>)",
      `let mut count = 0;
    let mut collected = Vec::new();
    loop {
        let lease = match source.receive() {
            Some(lease) => lease,
            None => break,
        };
        count += 1;
        collected.extend_from_slice(lease.bytes());
        lease.commit();
        std::future::ready(()).await;
    }
    (count, collected)`,
    );
  if (id === "async-lending-cancel-commit-review")
    return replaceFunctionBody(
      solution,
      "fn cancel_and_report(cursor: &mut Cursor, effects: &mut Vec<u8>) -> Result<usize, &'static str>",
      `let lease = cursor.receive().ok_or("empty")?;
    let mut callback = Box::pin(EffectFuture::new(lease.value(), effects));
    let mut completed = false;
    for _ in 0..32 {
        match poll_once(callback.as_mut()) {
            Poll::Ready(()) => {
                completed = true;
                break;
            }
            Poll::Pending => break,
        }
    }
    if completed {
        lease.commit();
        Ok(1)
    } else {
        drop(callback);
        Err("cancel before commit")
    }`,
    );
  if (id === "async-lending-send-boundary-review")
    return replaceFunctionBody(
      solution,
      "async fn own_report_via_handoff(bytes: Vec<u8>) -> OwnedReport",
      `let mut owned = Vec::with_capacity(bytes.len());
    owned.extend(bytes);
    let owned = std::future::ready(owned).await;
    OwnedReport { bytes: owned }`,
    );
  if (id === "async-lending-dyn-adapter-review")
    return replaceFunctionBody(
      solution,
      "async fn materialize<'a>(adapter: Boxed<'a>) -> Vec<Report>",
      `let mut adapter = adapter;
    enum Stage<'a> {
    Waiting(Option<Pin<Box<dyn Future<Output = Option<Report>> + 'a>>>),
    Ready(Vec<Report>),
    }
    let mut stage = Stage::Waiting(Some(adapter.provider.next()));
    loop {
        stage = match stage {
            Stage::Waiting(mut future) => {
                let mut reports = Vec::new();
                if let Some(report) = future.take().expect("missing boxed future").await {
                    reports.push(report);
                }
                Stage::Ready(reports)
            }
            Stage::Ready(reports) => return reports,
        };
    }`,
    );
  if (id === "async-lending-receiver-gate")
    return replaceFunctionBody(
      solution,
      "fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>",
      `let this = self.get_mut();
    match this.pending {
        true => {
            this.pending = false;
            cx.waker().wake_by_ref();
            Poll::Pending
        }
        false => {
            let Some(receiver) = this.receiver.take() else {
                return Poll::Ready(None);
            };
            let index = receiver.cursor;
            if index < receiver.packets.len() {
                Poll::Ready(Some(Borrowed { receiver: Some(receiver), index }))
            } else {
                Poll::Ready(None)
            }
        }
    }`,
    );
  if (id === "async-lending-receiver-blank")
    return replaceFunctionBody(
      solution,
      "fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>",
      `let this = self.get_mut();
    if this.pending {
        this.pending = false;
        cx.waker().wake_by_ref();
        return Poll::Pending;
    }
    match this.receiver.take() {
        Some(receiver) if receiver.cursor < receiver.packets.len() => {
            let index = receiver.cursor;
            Poll::Ready(Some(Borrowed { receiver: Some(receiver), index }))
        }
        Some(_) | None => Poll::Ready(None),
    }`,
    );
  if (id === "async-lending-callbacks-gate")
    return replaceFunctionBody(
      solution,
      "async fn run_sequential<F, E>(source: &mut Source, mut callback: F) -> Result<usize, E>",
      `let mut visited = 0;
    loop {
        let lease = match source.receive() {
            Some(lease) => lease,
            None => return Ok(visited),
        };
        match callback(lease.bytes()).await {
            Ok(()) => {
                lease.commit();
                visited += 1;
            }
            Err(error) => return Err(error),
        }
    }`,
    );
  if (id === "async-lending-callbacks-blank")
    return replaceFunctionBody(
      solution,
      "async fn run_sequential<F, E>(source: &mut Source, mut callback: F) -> Result<usize, E>",
      `let mut visited = 0;
    let mut open = true;
    while open {
        match source.receive() {
            Some(lease) => {
                let result = callback(lease.bytes()).await;
                if let Err(error) = result {
                    return Err(error);
                }
                lease.commit();
                visited += 1;
            }
            None => open = false,
        }
    }
    Ok(visited)`,
    );
  if (id === "async-lending-cancel-commit-gate")
    return replaceFunctionBody(
      solution,
      "fn process(cursor: &mut Cursor, effects: &mut Vec<u8>, cancel: bool) -> Result<usize, &'static str>",
      `enum Outcome {
        Cancelled,
        Committed,
    }
    let lease = cursor.receive().ok_or("empty")?;
    let mut callback = Box::pin(EffectFuture::new(lease.value(), effects));
    let outcome = match cancel {
        true => {
            assert!(poll_once(callback.as_mut()).is_pending());
            drop(callback);
            Outcome::Cancelled
        }
        false => {
            block_on(callback);
            lease.commit();
            Outcome::Committed
        }
    };
    match outcome {
        Outcome::Cancelled => Err("cancel before commit"),
        Outcome::Committed => Ok(1),
    }`,
    );
  if (id === "async-lending-cancel-commit-blank")
    return replaceFunctionBody(
      solution,
      "fn process(cursor: &mut Cursor, effects: &mut Vec<u8>, cancel: bool) -> Result<usize, &'static str>",
      `let lease = cursor.receive().ok_or("empty")?;
    let mut callback = Box::pin(EffectFuture::new(lease.value(), effects));
    let completed = match cancel {
        true => {
            let _ = poll_once(callback.as_mut());
            drop(callback);
            false
        }
        false => {
            block_on(callback.as_mut());
            true
        }
    };
    if completed {
        lease.commit();
        Ok(1)
    } else {
        Err("cancel before commit")
    }`,
    );
  if (id === "async-lending-send-boundary-gate")
    return replaceFunctionBody(
      solution,
      "fn owned_report(bytes: Vec<u8>) -> impl Future<Output = OwnedReport> + Send + 'static",
      `async move {
        let mut owned = Vec::with_capacity(bytes.len());
        owned.extend(bytes);
        OwnedReport { bytes: owned }
    }`,
    );
  if (id === "async-lending-send-boundary-blank")
    return replaceFunctionBody(
      solution,
      "fn owned_report(bytes: Vec<u8>) -> impl Future<Output = OwnedReport> + Send + 'static",
      `async move {
        let bytes = bytes.into_iter().collect::<Vec<_>>();
        std::future::ready(OwnedReport { bytes }).await
    }`,
    );
  if (id === "async-lending-dyn-adapter-gate")
    return replaceFunctionBody(
      solution,
      "async fn one(mut self) -> Option<Report>",
      `let mut provider = self.provider;
    let mut reports = Vec::new();
    if let Some(report) = provider.next().await {
        reports.push(report);
    }
    reports.pop()`,
    );
  if (id === "async-lending-dyn-adapter-blank")
    return replaceFunctionBody(
      solution,
      "async fn one(mut self) -> Option<Report>",
      `enum State<'a> {
        Provider(Box<dyn Provider + 'a>),
        Finished(Option<Report>),
    }
    let mut state = State::Provider(self.provider);
    loop {
        state = match state {
            State::Provider(mut provider) => State::Finished(provider.next().await),
            State::Finished(report) => return report,
        };
    }`,
    );
  throw new Error(`Missing async lending equivalent: ${id}`);
}

export const asyncLendingAssessmentFixtures: AsyncLendingAssessmentFixture[] =
  assessments.map((step) => {
    if (!step.solution || step.evaluator?.kind !== "tests")
      throw new Error(`Missing async lending solution: ${step.id}`);
    return {
      id: step.id,
      equivalent: equivalent(step.id, step.solution),
      mutant: mutate(step.id, step.solution),
      ...(step.id === "async-lending-receiver-bounded-batch"
        ? { mutants: [batchFinishMutant(step.solution)] }
        : {}),
    };
  });
