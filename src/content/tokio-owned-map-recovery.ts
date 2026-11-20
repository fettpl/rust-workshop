import { tokioExercise } from "./tokio-helpers";

export const tokioOwnedMapRecovery = tokioExercise({
  id: "tokio-spawn-blocking-boundary-map-transfer",
  kind: "apply",
  title: "Przenieś mapowanie posiadanej partii na pulę blocking",
  prompt:
    "Napisz `fn spawn_owned_map<T, U, F>(values: Vec<T>, transform: F) -> tokio::task::JoinHandle<Vec<U>>`. Posiadane values oraz closure `FnMut(T) -> U` mają przekroczyć granicę `Send + 'static`; nie wymagaj Clone, Copy ani Sync. Zwróć od razu prawdziwy JoinHandle bez awaitowania. Dopiero na puli blocking wywołaj transform dokładnie raz dla każdej wartości i zachowaj kolejność wyników. Stan mutable closure przechodzi między elementami. Pusty Vec daje pusty wynik bez wywołania transform. Panic ma pozostać prawdziwym JoinError odbieranym przez wywołującego. Lokalny kod async po await nie potrzebuje dodatkowych ograniczeń.",
  code: `fn spawn_owned_map<T, U, F>(values: Vec<T>, transform: F) -> tokio::task::JoinHandle<Vec<U>>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnMut(T) -> U + Send + 'static,
{
    panic!("przenieś całą partię i closure na pulę blocking")
}`,
  solution: `fn spawn_owned_map<T, U, F>(values: Vec<T>, transform: F) -> tokio::task::JoinHandle<Vec<U>>
where
    T: Send + 'static,
    U: Send + 'static,
    F: FnMut(T) -> U + Send + 'static,
{
    tokio::task::spawn_blocking(move || values.into_iter().map(transform).collect())
}`,
  tests: `#[tokio::test(flavor = "current_thread")]
async fn transforms_owned_non_copy_values_once_in_order_on_the_blocking_pool() {
    use std::cell::Cell;
    use std::rc::Rc;
    use tokio::sync::oneshot;

    struct Input(String);
    #[derive(Debug, PartialEq)]
    struct Output { label: String, ordinal: usize }

    let executor = std::thread::current().id();
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = std::sync::mpsc::channel::<()>();
    let mut started = Some(started_tx);
    let mut calls = 0;
    // Cell and Receiver are Send but not Sync. Both are owned by this FnMut.
    let marker = Cell::new(0);
    let handle: tokio::task::JoinHandle<Vec<Output>> = spawn_owned_map(
        vec![Input(String::from("żółć")), Input(String::from("🙂"))],
        move |item| {
            if let Some(started) = started.take() {
                started.send(std::thread::current().id()).unwrap();
                release_rx.recv().unwrap();
            }
            calls += 1;
            marker.set(marker.get() + 1);
            assert_eq!(calls, marker.get());
            Output { label: item.0, ordinal: calls }
        },
    );
    let worker = started_rx.await.unwrap();
    assert_ne!(worker, executor);
    release_tx.send(()).unwrap();
    // These stay local across await and do not cross the blocking boundary.
    let prefix = String::from("local:");
    let seen = Rc::new(Cell::new(0));
    let prefix_view = prefix.as_str();
    let output = handle.await.unwrap();
    seen.set(output.len());
    assert_eq!(seen.get(), 2);
    assert_eq!(prefix_view, "local:");
    assert_eq!(output, vec![
        Output { label: String::from("żółć"), ordinal: 1 },
        Output { label: String::from("🙂"), ordinal: 2 },
    ]);
}
#[tokio::test(flavor = "current_thread")]
async fn empty_input_never_calls_transform_and_panic_keeps_join_error() {
    let empty = spawn_owned_map(Vec::<String>::new(), |_: String| -> String {
        panic!("empty input must not call transform")
    }).await.unwrap();
    assert!(empty.is_empty());
    let failed = spawn_owned_map(vec![String::from("owned")], |_: String| -> String {
        panic!("worker transform panic")
    }).await;
    assert!(failed.unwrap_err().is_panic());
}`,
  hints: [
    "Przenieś Vec i closure przez move do jednego zadania blocking; iteruj dopiero wewnątrz niego.",
    "into_iter przekazuje własność kolejnych elementów. map z FnMut i collect zachowują ich kolejność w nowym Vec.",
  ],
  gate: true,
});
