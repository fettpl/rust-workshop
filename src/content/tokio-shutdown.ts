import { choose, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const tokioShutdownSources: Source[] = [
  {
    id: "tokio-shutdown-mpsc-receiver-close",
    title: "Tokio 1.53: mpsc::Receiver::close",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Receiver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki close, recv, pojemności kanału albo wyjątków dla wcześniej wydanych Permit.",
  },
  {
    id: "tokio-shutdown-watch-receiver",
    title: "Tokio 1.53: sync::watch::Receiver",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/watch/struct.Receiver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie changed, borrow_and_update albo wyniku po Drop ostatniego watch::Sender.",
  },
  {
    id: "tokio-shutdown-join-set",
    title: "Tokio 1.53: task::JoinSet",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/struct.JoinSet.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie join_next_with_id, JoinError, shutdown lub join_all.",
  },
  {
    id: "tokio-shutdown-select",
    title: "Tokio 1.53: select!",
    url: "https://docs.rs/tokio/1.53.1/tokio/macro.select.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie anulowania gałęzi albo gwarancji cancellation safety recv i changed.",
  },
];

export const tokioShutdownCompetencies: Competency[] = [
  {
    id: "stop-admission-and-drain",
    title: "Po stop zatrzymujesz admission i drenujesz zaakceptowaną pracę.",
  },
  {
    id: "coordinate-cooperative-stop",
    title: "Ustalasz politykę watch dla true, false i utraty nadawcy.",
  },
  {
    id: "retain-every-child-outcome",
    title: "Sygnalizujesz dzieciom stop i zachowujesz każdy rezultat.",
  },
];

export const tokioShutdownConcepts: Concept[] = [
  {
    id: "tokio-graceful-shutdown",
    title: "Łagodne zamknięcie najpierw zatrzymuje wejście, potem kończy pracę",
    prerequisites: ["tokio-select-cancellation"],
    competencyIds: [
      "stop-admission-and-drain",
      "coordinate-cooperative-stop",
      "retain-every-child-outcome",
    ],
    reviewPrompt:
      "Jakie trzy fazy ma łagodne zamknięcie bounded pipeline z watch i JoinSet, co robisz z wcześniej wydanym Permit oraz dlaczego nie wolno zastąpić kończenia dzieci przez JoinSet::shutdown lub join_all?",
    reviewAnswer:
      "Najpierw polityka zatrzymania zamyka Receiver, aby zwykły Sender nie przyjął kolejnej pracy. Potem odbierasz z Receiver aż do None i przetwarzasz elementy już w buforze; wcześniejszy Permit lub OwnedPermit może jeszcze wstawić pracę, więc nie wolno zakończyć drain po samym close. Następnie wysyłasz watch=true, a każde współpracujące dziecko sprawdza je i samo kończy. W pętli join_next_with_id zachowujesz każdy Result, w tym JoinError i jego panic payload. Wartość true zastana przed pierwszym changed także oznacza stop, false nie oznacza stop, a po Drop ostatniego Sender przyjęta tu polityka wyłącza gałąź changed i kończy po EOF wejścia. JoinSet::shutdown abortuje dzieci, a join_all panikuje przy pierwszym JoinError i anuluje resztę, więc żadna z tych metod nie realizuje współpracującego cleanup z pełnym raportem.",
    distinguish:
      "Łagodne zamknięcie jest protokołem współpracy, nie obietnicą natychmiastowego zatrzymania. Coordinator najpierw odczytuje aktualne true, więc widoczny już stop zamyka admission przed odbiorem gotowej pracy; false nie jest stopem i wraca do zwykłego oczekiwania. Sygnał, który nadejdzie po tym sprawdzeniu, ściga się z bieżącym poll i zostanie ponownie sprawdzony przed callbackiem, lecz Tokio nie daje atomowości z zewnętrznym send ani ścisłej gwarancji fairness select. Nie cofnie też zewnętrznego efektu, nie przerwie bezpiecznie blokującego kodu ani nie zagwarantuje, kiedy dziecko odpowie. Dla takich granic potrzebujesz jawnej polityki: ogranicz lub izoluj blokowanie, projektuj efekty jako idempotentne albo kompensowalne i po ewentualnym wymuszonym abort zachowaj wynik jako przerwany, a nie zakończony łagodnie.",
  },
];

const shutdownRun = `use tokio::sync::{mpsc, watch};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap()
        .block_on(async {
            let (tx, mut rx) = mpsc::channel::<String>(2);
            let permit = tx.reserve().await.unwrap();
            tx.send(String::from("accepted")).await.unwrap();

            let (stop_tx, mut stop_rx) = watch::channel(false);
            stop_tx.send(true).unwrap();
            assert!(stop_rx.changed().await.is_ok());
            assert!(*stop_rx.borrow_and_update());

            rx.close();
            permit.send(String::from("reserved-before-close"));

            let mut drained = Vec::new();
            while let Some(item) = rx.recv().await {
                drained.push(item);
            }
            println!("{drained:?}");
        });
}`;

const drainStarter = `use tokio::sync::{mpsc, watch};

async fn drain_on_shutdown<T, U, F>(
    input: mpsc::Receiver<T>,
    shutdown: watch::Receiver<bool>,
    consume: F,
) -> Vec<U>
where
    F: FnMut(T) -> U,
{
    let _ = (input, shutdown, consume);
    Vec::new()
}`;

const drainSolution = `use tokio::sync::{mpsc, watch};

async fn drain_on_shutdown<T, U, F>(
    mut input: mpsc::Receiver<T>,
    mut shutdown: watch::Receiver<bool>,
    mut consume: F,
) -> Vec<U>
where
    F: FnMut(T) -> U,
{
    let mut stopping = false;
    let mut watch_open = true;
    let mut output = Vec::new();

    loop {
        if !stopping && *shutdown.borrow_and_update() {
            stopping = true;
            input.close();
        }

        if stopping {
            match input.recv().await {
                Some(value) => output.push(consume(value)),
                None => return output,
            }
            continue;
        }

        tokio::select! {
            changed = shutdown.changed(), if watch_open => match changed {
                Ok(()) => {}
                Err(_) => watch_open = false,
            },
            value = input.recv() => match value {
                Some(value) => {
                    if *shutdown.borrow_and_update() {
                        stopping = true;
                        input.close();
                    }
                    output.push(consume(value));
                }
                None => return output,
            },
        }
    }
}`;

const drainTests = `#[tokio::test(flavor = "current_thread")]
async fn already_true_closes_admission_and_drains_buffered_non_copy_values() {
    use std::sync::{Arc, Mutex};
    use tokio::sync::{mpsc, watch};

    struct Ticket {
        label: String,
        drops: Arc<Mutex<Vec<String>>>,
    }
    impl Drop for Ticket {
        fn drop(&mut self) {
            self.drops.lock().unwrap().push(self.label.clone());
        }
    }

    let effects = Arc::new(Mutex::new(Vec::new()));
    let drops = Arc::new(Mutex::new(Vec::new()));
    let (tx, rx) = mpsc::channel(3);
    for label in ["alpha", "beta"] {
        tx.send(Ticket {
            label: String::from(label),
            drops: Arc::clone(&drops),
        }).await.unwrap();
    }
    let (_stop_tx, stop_rx) = watch::channel(true);
    let effects_in_consumer = Arc::clone(&effects);

    let output = drain_on_shutdown(rx, stop_rx, move |ticket| {
        effects_in_consumer
            .lock()
            .unwrap()
            .push(format!("consumed:{}", ticket.label));
        format!("done:{}", ticket.label)
    }).await;

    assert_eq!(output, vec!["done:alpha", "done:beta"]);
    assert_eq!(*effects.lock().unwrap(), vec!["consumed:alpha", "consumed:beta"]);
    let rejected = tx.send(Ticket {
        label: String::from("late"),
        drops: Arc::clone(&drops),
    }).await.unwrap_err().0;
    assert_eq!(rejected.label, "late");
    drop(rejected);
    let mut dropped = drops.lock().unwrap().clone();
    dropped.sort();
    assert_eq!(dropped, vec!["alpha", "beta", "late"]);
}

#[tokio::test(flavor = "current_thread")]
async fn later_true_drains_a_previously_reserved_value_and_ignores_false() {
    use std::sync::{Arc, Mutex};
    use tokio::sync::{mpsc, oneshot, watch};

    let (tx, rx) = mpsc::channel(2);
    let permit = tx.reserve().await.unwrap();
    let (stop_tx, stop_rx) = watch::channel(false);
    stop_tx.send(false).unwrap();
    let (observed_tx, observed_rx) = oneshot::channel();
    let mut observed_tx = Some(observed_tx);
    let effects = Arc::new(Mutex::new(Vec::new()));
    let effects_in_consumer = Arc::clone(&effects);
    let draining = tokio::spawn(drain_on_shutdown(rx, stop_rx, move |value: String| {
        effects_in_consumer.lock().unwrap().push(value.clone());
        if value == "first" {
            observed_tx.take().unwrap().send(()).unwrap();
        }
        format!("handled:{value}")
    }));

    tx.send(String::from("first")).await.unwrap();
    observed_rx.await.unwrap();
    stop_tx.send(true).unwrap();
    permit.send(String::from("reserved"));

    assert_eq!(draining.await.unwrap(), vec!["handled:first", "handled:reserved"]);
    assert_eq!(*effects.lock().unwrap(), vec!["first", "reserved"]);
    assert_eq!(tx.send(String::from("late")).await.unwrap_err().0, "late");
}

#[tokio::test(flavor = "current_thread")]
async fn dropped_control_sender_keeps_draining_until_input_eof() {
    use tokio::sync::{mpsc, watch};

    let (tx, rx) = mpsc::channel(1);
    let (stop_tx, stop_rx) = watch::channel(false);
    drop(stop_tx);
    tx.send(String::from("still-input")).await.unwrap();
    drop(tx);

    assert_eq!(
        drain_on_shutdown(rx, stop_rx, |value| format!("kept:{value}")).await,
        vec!["kept:still-input"],
    );
}

#[tokio::test(flavor = "current_thread")]
async fn a_false_update_keeps_processing_input_until_eof() {
    use std::future::Future;
    use std::pin::Pin;
    use std::sync::Arc;
    use std::task::{Context, Poll, Wake, Waker};
    use tokio::sync::{mpsc, watch};

    struct Silent;
    impl Wake for Silent {
        fn wake(self: Arc<Self>) {}
    }
    fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
        let waker = Waker::from(Arc::new(Silent));
        let mut context = Context::from_waker(&waker);
        future.poll(&mut context)
    }

    let (tx, rx) = mpsc::channel(1);
    let (stop_tx, stop_rx) = watch::channel(false);
    let mut draining = Box::pin(drain_on_shutdown(rx, stop_rx, |value| {
        format!("handled:{value}")
    }));
    assert!(poll_once(draining.as_mut()).is_pending());

    tx.try_send(String::from("queued")).unwrap();
    stop_tx.send(false).unwrap();
    drop(tx);
    assert_eq!(draining.await, vec!["handled:queued"]);
}`;

const joinSolution = `use tokio::sync::watch;
use tokio::task::{Id, JoinError, JoinSet};

pub enum WorkerOutcome<T> {
    Completed { id: Id, value: T },
    Failed { id: Id, error: JoinError },
}

pub struct ShutdownJoin<T> {
    pub signal_delivered: bool,
    pub outcomes: Vec<WorkerOutcome<T>>,
}

pub async fn signal_and_join<T: 'static>(
    shutdown: &watch::Sender<bool>,
    workers: &mut JoinSet<T>,
) -> ShutdownJoin<T> {
    let signal_delivered = shutdown.send(true).is_ok();
    let mut outcomes = Vec::new();

    while let Some(result) = workers.join_next_with_id().await {
        match result {
            Ok((id, value)) => outcomes.push(WorkerOutcome::Completed { id, value }),
            Err(error) => {
                let id = error.id();
                outcomes.push(WorkerOutcome::Failed { id, error });
            }
        }
    }

    ShutdownJoin {
        signal_delivered,
        outcomes,
    }
}`;

const joinTests = `#[tokio::test(flavor = "current_thread")]
async fn signals_then_retains_success_cancellation_and_panic_with_task_identity() {
    use std::sync::{Arc, Mutex};
    use tokio::sync::{oneshot, watch};
    use tokio::task::{Id, JoinSet};

    struct DropProbe {
        label: String,
        drops: Arc<Mutex<Vec<String>>>,
    }
    impl Drop for DropProbe {
        fn drop(&mut self) {
            self.drops.lock().unwrap().push(self.label.clone());
        }
    }
    struct Value {
        id: Id,
        label: String,
        _probe: DropProbe,
    }

    let drops = Arc::new(Mutex::new(Vec::new()));
    let (stop_tx, stop_rx) = watch::channel(false);
    let mut workers = JoinSet::new();
    let (cancel_started_tx, cancel_started_rx) = oneshot::channel();
    let cancel_control = stop_rx.clone();
    let cancel_drops = Arc::clone(&drops);
    let cancelled = workers.spawn(async move {
        let _probe = DropProbe {
            label: String::from("cancelled"),
            drops: cancel_drops,
        };
        cancel_started_tx.send(()).unwrap();
        let mut control = cancel_control;
        control.changed().await.unwrap();
        std::future::pending::<Value>().await
    });
    cancel_started_rx.await.unwrap();
    cancelled.abort();

    let completed_control = stop_rx.clone();
    let completed_drops = Arc::clone(&drops);
    workers.spawn(async move {
        let mut control = completed_control;
        control.changed().await.unwrap();
        assert!(*control.borrow_and_update());
        Value {
            id: tokio::task::id(),
            label: String::from("finished"),
            _probe: DropProbe {
                label: String::from("finished"),
                drops: completed_drops,
            },
        }
    });

    let panic_control = stop_rx.clone();
    let panic_drops = Arc::clone(&drops);
    workers.spawn(async move {
        let mut control = panic_control;
        control.changed().await.unwrap();
        assert!(*control.borrow_and_update());
        let _probe = DropProbe {
            label: String::from("panicked"),
            drops: panic_drops,
        };
        std::panic::panic_any(String::from("panic payload"));
    });

    let report = signal_and_join(&stop_tx, &mut workers).await;
    assert!(report.signal_delivered);
    assert_eq!(report.outcomes.len(), 3);
    let mut saw_cancelled = false;
    let mut saw_completed = false;
    let mut saw_panicked = false;
    for outcome in report.outcomes {
        match outcome {
            WorkerOutcome::Completed { id, value } => {
                assert_eq!(id, value.id);
                assert_eq!(value.label, "finished");
                saw_completed = true;
                drop(value);
            }
            WorkerOutcome::Failed { id, error } if error.is_cancelled() => {
                assert_eq!(id, error.id());
                saw_cancelled = true;
            }
            WorkerOutcome::Failed { id, error } => {
                assert!(error.is_panic());
                assert_eq!(id, error.id());
                assert_eq!(
                    *error.into_panic().downcast::<String>().unwrap(),
                    "panic payload",
                );
                saw_panicked = true;
            }
        }
    }
    assert!(saw_cancelled && saw_completed && saw_panicked);
    let mut dropped = drops.lock().unwrap().clone();
    dropped.sort();
    assert_eq!(dropped, vec!["cancelled", "finished", "panicked"]);
}

#[tokio::test(flavor = "current_thread")]
async fn joins_workers_even_when_no_receiver_observed_the_signal() {
    use tokio::sync::watch;
    use tokio::task::JoinSet;

    let (stop_tx, stop_rx) = watch::channel(false);
    drop(stop_rx);
    let mut workers = JoinSet::new();
    workers.spawn(async { vec![String::from("independent")] });

    let report = signal_and_join(&stop_tx, &mut workers).await;
    assert!(!report.signal_delivered);
    assert_eq!(report.outcomes.len(), 1);
    match report.outcomes.into_iter().next().unwrap() {
        WorkerOutcome::Completed { value, .. } => {
            assert_eq!(value, vec!["independent"]);
        }
        WorkerOutcome::Failed { error, .. } => panic!("unexpected worker failure: {error}"),
    }
}`;

const reviewStarter = `use tokio::sync::watch;
use tokio::task::{JoinError, JoinHandle};

async fn signal_and_collect<T>(
    shutdown: &watch::Sender<bool>,
    handles: Vec<(String, JoinHandle<T>)>,
) -> (bool, Vec<(String, Result<T, JoinError>)>) {
    let _ = (shutdown, handles);
    (false, Vec::new())
}`;

const reviewSolution = `use tokio::sync::watch;
use tokio::task::{JoinError, JoinHandle};

async fn signal_and_collect<T>(
    shutdown: &watch::Sender<bool>,
    handles: Vec<(String, JoinHandle<T>)>,
) -> (bool, Vec<(String, Result<T, JoinError>)>) {
    let signal_delivered = shutdown.send(true).is_ok();
    let mut outcomes = Vec::new();
    for (label, handle) in handles {
        outcomes.push((label, handle.await));
    }
    (signal_delivered, outcomes)
}`;

const reviewTests = `#[tokio::test(flavor = "current_thread")]
async fn retains_each_labeled_direct_handle_in_input_order() {
    use tokio::sync::watch;

    let (stop_tx, stop_rx) = watch::channel(false);
    let complete_control = stop_rx.clone();
    let complete = tokio::spawn(async move {
        let mut control = complete_control;
        control.changed().await.unwrap();
        assert!(*control.borrow_and_update());
        vec![String::from("complete")]
    });
    let cancelled = tokio::spawn(async { std::future::pending::<Vec<String>>().await });
    cancelled.abort();
    let panic_control = stop_rx.clone();
    let panicked = tokio::spawn(async move {
        let mut control = panic_control;
        control.changed().await.unwrap();
        assert!(*control.borrow_and_update());
        std::panic::panic_any(String::from("review panic"));
    });

    let (delivered, mut outcomes) = signal_and_collect(
        &stop_tx,
        vec![
            (String::from("complete"), complete),
            (String::from("cancelled"), cancelled),
            (String::from("panicked"), panicked),
        ],
    ).await;

    assert!(delivered);
    assert_eq!(outcomes.len(), 3);
    let (complete_label, complete_result) = outcomes.remove(0);
    assert_eq!(complete_label, "complete");
    assert_eq!(complete_result.unwrap(), vec!["complete"]);
    let (cancelled_label, cancelled_result) = outcomes.remove(0);
    assert_eq!(cancelled_label, "cancelled");
    assert!(cancelled_result.unwrap_err().is_cancelled());
    let (panic_label, panic_result) = outcomes.remove(0);
    assert_eq!(panic_label, "panicked");
    let error = panic_result.unwrap_err();
    assert!(error.is_panic());
    assert_eq!(
        *error.into_panic().downcast::<String>().unwrap(),
        "review panic",
    );
}

#[tokio::test(flavor = "current_thread")]
async fn no_signal_recipient_still_does_not_skip_a_direct_handle() {
    use tokio::sync::watch;

    let (stop_tx, stop_rx) = watch::channel(false);
    drop(stop_rx);
    let child = tokio::spawn(async { String::from("joined") });
    let (delivered, outcomes) = signal_and_collect(
        &stop_tx,
        vec![(String::from("child"), child)],
    ).await;

    assert!(!delivered);
    assert_eq!(outcomes.len(), 1);
    assert_eq!(outcomes.into_iter().next().unwrap().0, "child");
}`;

export const tokioShutdownLessons: Lesson[] = [
  {
    id: "tokio-graceful-shutdown",
    moduleId: "tokio-flow-control",
    conceptIds: ["tokio-graceful-shutdown"],
    competencyIds: [
      "stop-admission-and-drain",
      "coordinate-cooperative-stop",
      "retain-every-child-outcome",
    ],
    prerequisites: ["tokio-select-cancellation"],
    title: "Łagodne zamknięcie kanału i dzieci Tokio",
    subtitle:
      "Zatrzymasz nowe wejście, dokończysz przyjętą pracę i zachowasz rzeczywisty wynik każdego dziecka.",
    minutes: 30,
    outcomes: [
      "Zamkniesz Receiver, a potem odbierzesz wszystkie elementy przyjęte przed zamknięciem, także przez wydany wcześniej Permit.",
      "Obsłużysz true już zapisane w watch, kolejne true, aktualizację false oraz zamknięte źródło sygnału zgodnie z nazwaną polityką.",
      "Wyślesz kooperacyjny sygnał dzieciom i zachowasz wynik, anulowanie, panic payload oraz tożsamość każdego zadania.",
    ],
    steps: [
      choose(
        "tokio-graceful-shutdown-predict",
        "predict",
        "Najpierw zatrzymaj wejście",
        "Kanał bounded ma element w buforze i wcześniej wydany Permit. Co powinien zrobić coordinator po otrzymaniu polecenia stop?",
        1,
        [
          "Porzucić Receiver i JoinHandle; runtime sam wyczyści resztę.",
          "Zamknąć Receiver dla zwykłych send, opróżnić go do None, zasygnalizować dzieci i odebrać każdy ich wynik.",
          "Traktować każdą aktualizację watch, także false, jak polecenie natychmiastowego abort.",
        ],
        [
          "Porzucenie uchwytów nie dokumentuje wyniku dzieci, a wcześniej przyjęta praca może pozostać bez właściciela.",
          "Tak. close zatrzymuje zwykłe przyjmowanie, drain obejmuje pracę w buforze i z wcześniejszego Permit, a join daje raport z dzieci.",
          "false nie jest stop. Wymuszony abort jest inną polityką niż współpracujące zamknięcie.",
        ],
      ),
      tokioRun(
        "tokio-graceful-shutdown-run",
        "Permit może przeżyć close",
        "Uruchom przykład. Sygnał true istnieje zanim Receiver pierwszy raz czeka na changed. Przewidź, dlaczego po close nadal zobaczysz drugi napis.",
        shutdownRun,
        '["accepted", "reserved-before-close"]\n',
      ),
      choose(
        "tokio-graceful-shutdown-watch-policy",
        "explain",
        "Polityka po zniknięciu nadawcy",
        "Ostatni watch::Sender znika, gdy bieżąca wartość to false, a input nadal może dostawać pracę. Jaką politykę realizuje ta lekcja?",
        2,
        [
          "Pętla bez końca ponawia changed, bo Err oznacza jeszcze jeden sygnał.",
          "false automatycznie zamyka input, bo brak nadawcy jest równoważny true.",
          "Wyłączyć gałąź changed i dalej przetwarzać input aż do EOF; tylko true zamyka przyjmowanie.",
        ],
        [
          "Po zamknięciu Sender changed może kończyć się Err od razu; ponawianie tej gałęzi tworzy spin zamiast postępu.",
          "To byłaby inna, ostrzejsza polityka. Tutaj stop wymaga jawnego true.",
          "Tak. Kod nie zgaduje stop z utraty kanału sterującego i nadal ma aktywną drogę do zakończenia przez EOF.",
        ],
      ),
      tokioExercise({
        id: "tokio-graceful-shutdown-drain-gate",
        kind: "modify",
        title: "Połącz sygnał stop z drainem",
        prompt:
          "Uzupełnij `drain_on_shutdown`. Musi od razu rozpoznać true zapisane przed pierwszym `changed`, po true wywołać `close` i przetworzyć każdą zaakceptowaną wartość przez `FnMut`. Aktualizacja false nie zatrzymuje, a Err z `changed` wyłącza tylko gałąź sterowania: input kończy się dopiero przez EOF. Nie używaj czasu ani ręcznego poll.",
        code: drainStarter,
        solution: drainSolution,
        tests: drainTests,
        hints: [
          "Na początku odczytaj `*shutdown.borrow_and_update()`: wtedy aktualna wartość nie zostanie pomylona z nową zmianą.",
          "Przed oczekiwaniem sprawdź aktualne true. false nie jest stopem; po true wybierz prosty drain `recv` do None.",
        ],
        gate: true,
      }),
      choose(
        "tokio-graceful-shutdown-forced",
        "explain",
        "Join nie jest abortem",
        "Który wybór zachowuje wszystkie rzeczywiste rezultaty dzieci po wysłaniu współpracującego watch=true?",
        0,
        [
          "Pętla `join_next_with_id`, która zapisuje Ok i każdy JoinError przed pobraniem następnego dziecka.",
          "`JoinSet::shutdown()`, bo kończy wszystkie dzieci zanim zwróci kontrolę.",
          "`join_all()`, bo jeden panic wystarcza jako raport całego zestawu.",
        ],
        [
          "Tak. Id i Result pozostają w raporcie; kolejność jest kolejnością zakończenia, nie obietnicą schedulera.",
          "shutdown abortuje dzieci. To wymuszone zatrzymanie, a nie dowód, że zareagowały na sygnał.",
          "join_all panikuje przy pierwszym JoinError i anuluje pozostałe dzieci, więc ukrywa późniejsze rezultaty.",
        ],
      ),
      tokioExercise({
        id: "tokio-graceful-shutdown-join-blank",
        kind: "blank",
        title: "Zasygnalizuj i odbierz każdy wynik",
        prompt:
          "Od pustej kartki zdefiniuj `WorkerOutcome`, `ShutdownJoin` i `signal_and_join`. Funkcja ma spróbować wysłać true, zapisać czy sygnał miał odbiorcę, potem ręcznie odebrać każde dziecko JoinSet przez `join_next_with_id`. Zachowaj niekopiowalne Output, task::Id, JoinError oraz panic payload; nawet brak odbiorcy sygnału nie może pominąć join. Nie wywołuj abort, shutdown ani join_all.",
        solution: joinSolution,
        tests: joinTests,
        hints: [
          "`JoinSet::join_next_with_id` daje `Ok((id, value))` albo JoinError, z którego odczytasz `error.id()` przed przeniesieniem błędu do raportu.",
          "`watch::Sender::send(true).is_ok()` opisuje dostarczenie do odbiorcy, ale nie zmienia obowiązku odebrania wszystkich dzieci.",
        ],
        forbiddenPatterns: [
          ".abort(",
          "abort_all",
          ".shutdown(",
          ".join_all(",
          "std::mem::forget",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "close Receiver nie oznacza, że wcześniej wydany Permit nie może już wysłać wartości.",
      "watch::changed nie interpretuje false jako stop, a po Drop Sender nie powinien być ciasno wywoływany w pętli.",
      "JoinSet::shutdown i join_all nie są skrótami do kooperacyjnego cleanup z pełnym raportem wyników.",
      "Runtime nie gwarantuje anulowania blokującej pracy ani transakcyjnego cofnięcia efektów zewnętrznych.",
    ],
    transferTask:
      "Dla procesu zapisu plików zaprojektuj osobny kontrakt: które nowe zgłoszenia odrzucasz po true, jak oznaczasz już zaakceptowane zapisy, jak dokumentujesz worker blokujący i jakie kompensujące lub idempotentne działanie wykonasz po wymuszonym abort.",
    evidenceGate:
      "Przepuszcza tylko implementacja, która zamyka admission po true, drenuje także wartość z wcześniejszego Permit, ma politykę dla false i Drop Sender oraz zachowuje wszystkie wyniki dzieci bez wymuszonego abort.",
    sourceIds: tokioShutdownSources.map((source) => source.id),
  },
];

export const tokioShutdownReviewExercises: Record<string, LessonStep> = {
  "tokio-graceful-shutdown": tokioExercise({
    id: "review-tokio-graceful-shutdown",
    kind: "apply",
    title: "Zbierz oznaczone JoinHandle po sygnale",
    prompt:
      "Napisz `signal_and_collect` dla zwykłego `Vec<(String, JoinHandle<T>)>`. Wyślij true, zwróć czy istniał odbiorca, a następnie awaituj każdy uchwyt w kolejności wejścia, zachowując jego etykietę oraz Result. To celowo inny kontrakt niż JoinSet: raport ma kolejność wejściową i etykiety, nie Id oraz kolejność ukończenia. Brak odbiorcy sygnału nie zwalnia z join.",
    code: reviewStarter,
    solution: reviewSolution,
    tests: reviewTests,
    hints: [
      "Zapisz wynik `shutdown.send(true).is_ok()` zanim zaczniesz awaitować uchwyty.",
      "W pętli for przenieś naraz etykietę i JoinHandle, a do wektora włóż wynik `handle.await` bez unwrap.",
    ],
    forbiddenPatterns: [
      ".abort(",
      "abort_all",
      ".shutdown(",
      ".join_all(",
      "JoinSet",
      "std::mem::forget",
    ],
  }),
};
