import type { LessonStep } from "../domain/types";

export const fallibleDrainTransfer: LessonStep = {
  id: "tokio-graceful-shutdown-fallible-drain-transfer",
  kind: "apply",
  title: "Rozlicz błędy bez zatrzymania drainu",
  prompt:
    "Napisz `async fn drain_results<T,U,E,F>(input: tokio::sync::mpsc::Receiver<T>, shutdown: tokio::sync::watch::Receiver<bool>, consume: F) -> Vec<Result<U,E>> where F: FnMut(T) -> Result<U,E>`. Każdą zaakceptowaną wartość przekaż dokładnie raz do callbacku w kolejności kanału; zachowaj oryginalne Ok i Err bez ograniczeń Clone, Copy ani Send. Błąd callbacku nie zatrzymuje odbioru. True zastane przed pierwszym oczekiwaniem lub późniejsza aktualizacja true zamykają admission przed kolejnym callbackiem; po close odbieraj do None, także wcześniejsze Permit. False nie zamyka, a utrata nadawcy watch z ostatnim false wyłącza sterowanie i czeka na EOF wejścia. Zwróć cały raport, także dla pustego kanału. Nie używaj czasu ani ręcznego poll w rozwiązaniu.",
  solution: `use tokio::sync::{mpsc, watch};
async fn drain_results<T,U,E,F>(mut input: mpsc::Receiver<T>, mut shutdown: watch::Receiver<bool>, mut consume: F) -> Vec<Result<U,E>>
where F: FnMut(T) -> Result<U,E> {
    let mut results=Vec::new();
    let mut stopping=false;
    let mut watch_open=true;
    loop {
        if !stopping && *shutdown.borrow_and_update() { input.close(); stopping=true; }
        if stopping {
            match input.recv().await { Some(value) => results.push(consume(value)), None => return results }
        } else {
            tokio::select! {
                changed=shutdown.changed(), if watch_open => { if changed.is_err() { watch_open=false; } },
                value=input.recv() => match value {
                    Some(value) => {
                        if *shutdown.borrow_and_update() { input.close(); stopping=true; }
                        results.push(consume(value));
                    },
                    None => return results,
                }
            }
        }
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `use std::{future::Future, pin::Pin, sync::Arc, task::{Context, Poll, Wake, Waker}};
struct Quiet;
impl Wake for Quiet { fn wake(self: Arc<Self>) {} }
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker=Waker::from(Arc::new(Quiet));
    future.poll(&mut Context::from_waker(&waker))
}

#[tokio::test(flavor="current_thread")]
async fn current_true_closes_before_callbacks_and_keeps_errors_and_permit_values() {
    use tokio::sync::{mpsc,watch};
    struct Ticket(String);
    let (tx,rx)=mpsc::channel(3);
    let permit=tx.reserve().await.unwrap();
    tx.send(Ticket(String::from("error"))).await.unwrap();
    tx.send(Ticket(String::from("buffered"))).await.unwrap();
    let (_stop_tx,stop)=watch::channel(true);
    let seen=std::rc::Rc::new(std::cell::RefCell::new(Vec::new()));
    let log=seen.clone();
    let sender=&tx;
    let mut future=Box::pin(drain_results(rx,stop,move |ticket:Ticket| {
        assert!(sender.is_closed(),"close precedes callback for already true");
        log.borrow_mut().push(ticket.0.clone());
        if ticket.0=="error" {Err(ticket)} else {Ok(ticket)}
    }));
    assert!(poll_once(future.as_mut()).is_pending());
    assert!(tx.is_closed());
    let rejected=tx.send(Ticket(String::from("late"))).await.unwrap_err().0;
    assert_eq!(rejected.0,"late");
    permit.send(Ticket(String::from("reserved")));
    let values=match poll_once(future.as_mut()) { Poll::Ready(v)=>v,Poll::Pending=>panic!("drain did not finish") };
    let labels:Vec<_>=values.into_iter().map(|v|match v {Ok(t)=>(true,t.0),Err(t)=>(false,t.0)}).collect();
    assert_eq!(labels,vec![(false,String::from("error")),(true,String::from("buffered")),(true,String::from("reserved"))]);
    assert_eq!(*seen.borrow(),vec!["error","buffered","reserved"]);
}

#[tokio::test(flavor="current_thread")]
async fn false_is_not_stop_and_later_true_waits_for_earlier_reservation() {
    use tokio::sync::{mpsc,watch};
    let (tx,rx)=mpsc::channel(2);
    let permit=tx.reserve().await.unwrap();
    let (stop_tx,stop)=watch::channel(false);
    let mut future=Box::pin(drain_results(rx,stop,|value:i32| if value<0 {Err(value)} else {Ok(value)}));
    assert!(poll_once(future.as_mut()).is_pending());
    stop_tx.send(false).unwrap();
    assert!(poll_once(future.as_mut()).is_pending());
    assert!(!tx.is_closed());
    tx.send(-4).await.unwrap();
    assert!(poll_once(future.as_mut()).is_pending());
    assert!(!tx.is_closed());
    stop_tx.send(true).unwrap();
    assert!(poll_once(future.as_mut()).is_pending());
    assert!(tx.is_closed());
    permit.send(9);
    assert_eq!(poll_once(future.as_mut()),Poll::Ready(vec![Err(-4),Ok(9)]));
}

#[tokio::test(flavor="current_thread")]
async fn dropped_watch_false_continues_to_input_eof_and_empty_is_empty() {
    use tokio::sync::{mpsc,watch};
    let (tx,rx)=mpsc::channel(1);
    let (stop_tx,stop)=watch::channel(false);
    drop(stop_tx);
    let mut future=Box::pin(drain_results(rx,stop,Ok::<_,()>));
    assert!(poll_once(future.as_mut()).is_pending());
    assert!(!tx.is_closed());
    tx.send(String::from("after-watch-eof")).await.unwrap();
    assert!(poll_once(future.as_mut()).is_pending());
    drop(tx);
    assert_eq!(poll_once(future.as_mut()),Poll::Ready(vec![Ok(String::from("after-watch-eof"))]));
    let (tx,rx)=mpsc::channel::<i32>(1); drop(tx);
    let (_stop_tx,stop)=watch::channel(true);
    assert_eq!(drain_results(rx,stop,Ok::<_,()>).await,Vec::new());
}
`,
    forbiddenPatterns: [
      "unsafe",
      "std::thread",
      "try_recv",
      "abort",
      "std::mem::forget",
      "yield_now",
      "sleep(",
    ],
  },
  hints: [
    "Zachowaj stan protokołu między kolejnymi oczekiwaniami.",
    "Sprawdź, co pozostaje w kanale i kto jest właścicielem wyniku.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  trustedFixtureTarget: "cargo-tokio-runtime-1.54.1",
};

export const receiverBatchTransfer: LessonStep = {
  id: "tokio-receiver-stream-drain-batch-or-stop-transfer",
  kind: "apply",
  title: "Odbierz ograniczoną partię bez zjadania kolejnego elementu",
  prompt:
    "Napisz `enum BatchRead<T> { Limit(Vec<T>), Closed(Vec<T>), Stopped(Vec<T>) }` oraz `async fn batch_or_stop<T>(stream: &mut tokio_stream::wrappers::ReceiverStream<T>, stop: &mut tokio::sync::oneshot::Receiver<()>, limit: usize) -> BatchRead<T>`. Limit 0 natychmiast daje Limit([]), bez odczytu stream ani stop. Przy każdym kolejnym elemencie stop ma pierwszeństwo, gdy obie gałęzie są gotowe. Wysłanie lub Drop stop Sendera daje Stopped z już odebraną partią, EOF daje Closed, osiągnięcie limitu daje Limit bez dodatkowego poll. Nie zamykaj kanału; po Stopped oraz Limit kolejny nieodebrany element musi pozostać w tym samym streamie. Zachowuj własność niekopiowalnych wartości i nie wymagaj Clone ani Send.",
  solution: `use tokio::sync::oneshot;
use tokio_stream::{wrappers::ReceiverStream,StreamExt};
enum BatchRead<T> { Limit(Vec<T>), Closed(Vec<T>), Stopped(Vec<T>) }
async fn batch_or_stop<T>(stream: &mut ReceiverStream<T>, stop: &mut oneshot::Receiver<()>, limit: usize) -> BatchRead<T> {
    let mut values=Vec::new();
    while values.len()<limit {
        tokio::select! {
            biased;
            _ = &mut *stop => return BatchRead::Stopped(values),
            value=stream.next() => match value {Some(value)=>values.push(value),None=>return BatchRead::Closed(values)},
        }
    }
    BatchRead::Limit(values)
}`,
  evaluator: {
    kind: "tests",
    tests: `use std::{future::Future, pin::Pin, sync::Arc, task::{Context, Poll, Wake, Waker}};
struct Quiet;
impl Wake for Quiet { fn wake(self: Arc<Self>) {} }
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker=Waker::from(Arc::new(Quiet));
    future.poll(&mut Context::from_waker(&waker))
}

#[tokio::test(flavor="current_thread")]
async fn zero_limit_touches_neither_ready_stop_nor_non_copy_queue() {
    use tokio::sync::{mpsc,oneshot};
    use tokio_stream::{wrappers::ReceiverStream,StreamExt};
    struct Token(String);
    let (tx,rx)=mpsc::channel(2);
    let value=Token(String::from("original")); let ptr=value.0.as_ptr();
    tx.send(value).await.unwrap();
    let mut stream=ReceiverStream::new(rx);
    let (stop_tx,mut stop)=oneshot::channel(); stop_tx.send(()).unwrap();
    assert!(matches!(batch_or_stop(&mut stream,&mut stop,0).await,BatchRead::Limit(v) if v.is_empty()));
    assert!(matches!(batch_or_stop(&mut stream,&mut stop,2).await,BatchRead::Stopped(v) if v.is_empty()));
    let next=stream.next().await.unwrap(); assert_eq!(next.0,"original"); assert_eq!(next.0.as_ptr(),ptr);
    assert!(!tx.is_closed());
}

#[tokio::test(flavor="current_thread")]
async fn limit_preserves_next_and_eof_returns_partial_owned_batch() {
    use tokio::sync::{mpsc,oneshot};
    use tokio_stream::{wrappers::ReceiverStream,StreamExt};
    let (tx,rx)=mpsc::channel(3);
    for s in ["a","b","c"] {tx.send(String::from(s)).await.unwrap();}
    let mut stream=ReceiverStream::new(rx); let (_stop_tx,mut stop)=oneshot::channel();
    match batch_or_stop(&mut stream,&mut stop,2).await {BatchRead::Limit(v)=>assert_eq!(v,vec!["a","b"]),_=>panic!("wrong termination")}
    assert_eq!(stream.next().await,Some(String::from("c")));
    tx.send(String::from("tail")).await.unwrap(); drop(tx);
    match batch_or_stop(&mut stream,&mut stop,3).await {BatchRead::Closed(v)=>assert_eq!(v,vec!["tail"]),_=>panic!("wrong termination")}
    assert!(matches!(batch_or_stop(&mut stream,&mut stop,1).await,BatchRead::Closed(v) if v.is_empty()));
}

#[tokio::test(flavor="current_thread")]
async fn pending_batch_stops_before_ready_next_after_signal_or_sender_drop() {
    use tokio::sync::{mpsc,oneshot};
    use tokio_stream::{wrappers::ReceiverStream,StreamExt};
    for dropped in [false,true] {
        let (tx,rx)=mpsc::channel(2);tx.send(String::from("first")).await.unwrap();
        let mut stream=ReceiverStream::new(rx);let (stop_tx,mut stop)=oneshot::channel();
        let mut future=Box::pin(batch_or_stop(&mut stream,&mut stop,3));
        assert!(poll_once(future.as_mut()).is_pending());
        tx.send(String::from("next")).await.unwrap();
        if dropped {drop(stop_tx);} else {stop_tx.send(()).unwrap();}
        match poll_once(future.as_mut()) {Poll::Ready(BatchRead::Stopped(v))=>assert_eq!(v,vec!["first"]),_=>panic!("stop must win")}
        drop(future);
        assert_eq!(stream.next().await,Some(String::from("next")));
        assert!(!tx.is_closed());
    }
}
`,
    forbiddenPatterns: [
      "unsafe",
      "std::thread",
      "try_recv",
      "abort",
      "std::mem::forget",
      "yield_now",
      "sleep(",
    ],
  },
  hints: [
    "Zachowaj stan protokołu między kolejnymi oczekiwaniami.",
    "Sprawdź, co pozostaje w kanale i kto jest właścicielem wyniku.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  trustedFixtureTarget: "cargo-tokio-runtime-1.54.1",
};

export const receiverPartitionTransfer: LessonStep = {
  id: "tokio-receiver-stream-drain-partition-transfer",
  kind: "apply",
  title: "Zamknij kanał i rozdziel przyjętą pracę",
  prompt:
    "Napisz `async fn close_and_partition<T,F>(stream: &mut tokio_stream::wrappers::ReceiverStream<T>, keep: F) -> (Vec<T>, Vec<T>) where F: FnMut(&T) -> bool`. Zamknij admission przed pierwszym callbackiem, potem odbieraj do prawdziwego None, także wartości z wcześniejszych Permit. Każdą oryginalną wartość przekaż dokładnie raz do keep: true przenosi ją do pierwszego wektora, false do drugiego. W obu zachowaj kolejność wejścia. Nie wymagaj Clone, Copy ani Send i nie twórz zastępczych wartości. Oczekujący Permit może zostać wykorzystany albo upuszczony; samo close nie oznacza EOF. Pusty kanał daje dwa puste wektory. Po zakończeniu pożyczony stream pozostaje zamknięty i opróżniony.",
  solution: `use tokio_stream::{wrappers::ReceiverStream,StreamExt};
async fn close_and_partition<T,F>(stream: &mut ReceiverStream<T>, mut keep: F) -> (Vec<T>,Vec<T>)
where F: FnMut(&T) -> bool {
    stream.close();
    let mut accepted=Vec::new();
    let mut rejected=Vec::new();
    while let Some(value)=stream.next().await {
        if keep(&value) { accepted.push(value); } else { rejected.push(value); }
    }
    (accepted,rejected)
}`,
  evaluator: {
    kind: "tests",
    tests: `use std::{future::Future,pin::Pin,sync::Arc,task::{Context,Poll,Wake,Waker}};
struct Quiet;
impl Wake for Quiet { fn wake(self:Arc<Self>) {} }
fn poll_once<F:Future>(future:Pin<&mut F>)->Poll<F::Output> {
    let waker=Waker::from(Arc::new(Quiet)); future.poll(&mut Context::from_waker(&waker))
}
#[tokio::test(flavor="current_thread")]
async fn closes_before_classification_and_partitions_buffer_plus_earlier_permit() {
    use tokio::sync::mpsc;
    use tokio_stream::{wrappers::ReceiverStream,StreamExt};
    struct Job { label:String, keep:bool }
    let (tx,rx)=mpsc::channel(4);
    let permit=tx.reserve().await.unwrap();
    let mut pointers=Vec::new();
    for (label,keep) in [("one",true),("two",false),("three",true)] {
        let job=Job {label:String::from(label),keep};pointers.push(job.label.as_ptr());tx.send(job).await.unwrap();
    }
    let reserved=Job {label:String::from("four"),keep:false};pointers.push(reserved.label.as_ptr());
    let seen=std::rc::Rc::new(std::cell::RefCell::new(Vec::new()));let log=seen.clone();
    let mut stream=ReceiverStream::new(rx);
    let sender=&tx;
    let mut future=Box::pin(close_and_partition(&mut stream,move |job:&Job| {
        assert!(sender.is_closed(),"close before first classifier");
        log.borrow_mut().push(job.label.clone());job.keep
    }));
    assert!(poll_once(future.as_mut()).is_pending(),"outstanding permit is not EOF");
    assert!(tx.is_closed());
    let late=tx.send(Job{label:String::from("late"),keep:true}).await.unwrap_err().0;assert_eq!(late.label,"late");
    permit.send(reserved);
    let (accepted,rejected)=match poll_once(future.as_mut()) {Poll::Ready(v)=>v,Poll::Pending=>panic!("must drain to EOF")};
    drop(future);
    assert_eq!(accepted.iter().map(|job|job.label.as_str()).collect::<Vec<_>>(),vec!["one","three"]);
    assert_eq!(rejected.iter().map(|job|job.label.as_str()).collect::<Vec<_>>(),vec!["two","four"]);
    assert_eq!(accepted.iter().map(|job|job.label.as_ptr()).collect::<Vec<_>>(),vec![pointers[0],pointers[2]]);
    assert_eq!(rejected.iter().map(|job|job.label.as_ptr()).collect::<Vec<_>>(),vec![pointers[1],pointers[3]]);
    assert_eq!(*seen.borrow(),vec!["one","two","three","four"]);
    assert!(stream.next().await.is_none());
}

#[tokio::test(flavor="current_thread")]
async fn dropped_reservation_and_empty_channels_complete_without_fake_values() {
    use tokio::sync::mpsc;
    use tokio_stream::wrappers::ReceiverStream;
    let (tx,rx)=mpsc::channel::<String>(1);let permit=tx.reserve().await.unwrap();
    let mut stream=ReceiverStream::new(rx);let mut future=Box::pin(close_and_partition(&mut stream,|_|panic!("empty input has no classifier")));
    assert!(poll_once(future.as_mut()).is_pending());assert!(tx.is_closed());drop(permit);
    assert_eq!(poll_once(future.as_mut()),Poll::Ready((Vec::new(),Vec::new())));
    drop(future);
    let (tx,rx)=mpsc::channel::<String>(1);let mut stream=ReceiverStream::new(rx);
    assert_eq!(close_and_partition(&mut stream,|_|true).await,(Vec::new(),Vec::new()));assert!(tx.is_closed());
}
`,
    forbiddenPatterns: [
      "unsafe",
      "std::thread",
      "try_recv",
      "abort",
      "std::mem::forget",
      "yield_now",
      "sleep(",
    ],
  },
  hints: [
    "Zamknij stream przed odbiorem i klasyfikacją.",
    "Po każdym next sklasyfikuj pożyczoną wartość, a następnie przenieś ją do wybranego wektora.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  trustedFixtureTarget: "cargo-tokio-runtime-1.54.1",
};
