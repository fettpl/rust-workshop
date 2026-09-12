import type { ProjectContract, ProjectPackage } from "../../domain/types";

export const tokioPipelinePackage: ProjectPackage = {
  id: "tokio-pipeline-workshop",
  title: "Laboratorium: pipeline Tokio",
  description:
    "Zbuduj ograniczoną kolejkę, ogranicz aktywne zadania i zamknij przepływ z pełnym raportem wyników.",
  instructions: [
    "Rozpakuj pakiet i pobierz przypięte zależności przez cargo fetch --locked.",
    "Przeczytaj kontrakt README i testy. Uzupełnij enqueue, spawn_pipeline oraz run_pipeline w src/lib.rs.",
    "Sprawdź cargo test --offline --locked, format oraz Clippy. Testy czasu używają zegara wirtualnego Tokio.",
    "Odtwórz kontrpróby: utrata wiadomości przy anulowaniu, brak limitu zadań i pominięcie drain.",
    "Zapisz w ADR, kto posiada pracę oraz co zmienisz przy strumieniowym raporcie lub zewnętrznych efektach.",
  ],
  revealStepRefs: [
    {
      lessonId: "tokio-bounded-channels",
      stepId: "tokio-bounded-channels-blank",
    },
    {
      lessonId: "tokio-reservation-cancellation",
      stepId: "tokio-reservation-cancellation-retain-gate",
    },
    {
      lessonId: "tokio-timeouts",
      stepId: "tokio-timeouts-owned-gate",
    },
    {
      lessonId: "tokio-select-cancellation",
      stepId: "tokio-select-cancellation-recv-gate",
    },
    {
      lessonId: "tokio-graceful-shutdown",
      stepId: "tokio-graceful-shutdown-join-blank",
    },
  ],
  files: [
    {
      path: "README.md",
      starter: `# Laboratorium: pipeline Tokio

Zaprojektuj kolejkę pracy, która ma ograniczony bufor i ograniczoną liczbę aktywnych zadań. Zamknięcie ma rozliczyć każdą przyjętą wiadomość: sukces, błąd domeny, timeout lub panic. To dodatkowe laboratorium po lekcjach Tokio, a nie gotowy serwer produkcyjny.

## Uruchomienie

Potrzebujesz stable Rust obsługującego edition 2024. Tokio jest przypięte do 1.53.1, a Cargo.lock zachowuje zależności. Pierwsze pobranie wymaga sieci:

\`\`\`sh
cargo fetch --locked
cargo fmt --all -- --check
cargo check --offline --locked --all-targets
cargo test --offline --locked
cargo clippy --offline --locked --all-targets -- -D warnings
\`\`\`

Uzupełnij \`enqueue\`, \`spawn_pipeline\` i \`run_pipeline\` w src/lib.rs. Starter kompiluje się, ale jego testy celowo zawodzą na \`todo!\`. Rozwiązanie referencyjne przechodzi testy i Clippy. Testy używają rzeczywistego Tokio oraz zatrzymanego zegara; sekundy w scenariuszach nie oznaczają czekania tyle czasu przy uruchomieniu. Nie zmieniaj testów, aby uzyskać zielony wynik.

Samo pobranie, lokalne testy i checklisty nie naliczają mastery w aplikacji. Zaliczenie wymaga samodzielnych zadań w lekcjach. Odsłonięcie pakietu zapisuje pomoc przy powiązanych zadaniach.

## Kontrakt

- \`Config.capacity\` ogranicza bufor mpsc; \`parallelism\` osobno ogranicza aktywne dzieci. Obie wartości są dodatnie. Pojemność musi też mieścić się w ograniczeniach Tokio mpsc. Nie pobieraj kolejnej wiadomości, gdy wszystkie miejsca pracy są zajęte.
- \`enqueue\` dostaje \`&mut Option<Job<T>>\`. Pusty slot to sukces, także przy zamkniętym kanale. Rezerwuj miejsce przed \`take\`; anulowanie oczekiwania i zamknięcie kanału pozostawiają wiadomość u wywołującego. Między \`take\` i wysłaniem przez Permit nie ma await.
- \`spawn_pipeline\` wywołuj wewnątrz działającego runtime Tokio z obsługą czasu. Przetwarzanie każdego Job działa w osobnym zadaniu. Fabryka \`process\` ma granice Send + Sync i jest współdzielona przez Arc; nie wymaga Clone. Wywołanie \`process(value)\` następuje w dziecku, żeby jego panic też miał przypisany identyfikator zadania.
- Deadline jest liczony osobno od rozpoczęcia pracy nad wiadomością, nie od wejścia do bufora. \`Outcome\` zachowuje posiadany wynik lub błąd domeny. Timeout usuwa posiadany Future pracy; \`JoinFailure\` zachowuje pełny JoinError, łącznie z panic payload.
- \`shutdown(self)\` sygnalizuje stop, zamyka zwykłe przyjmowanie i opróżnia bufor, a następnie odbiera każdy wynik. Nie używa abort dla normalnego zamknięcia. Klony Sender mogą pozostać u producentów; późniejsze zwykłe send zwróci im niesłany Job.
- Permit uzyskany przed close nadal może dostarczyć wiadomość. Shutdown czeka, aż taki Permit zostanie użyty lub upuszczony. Nie kończ drain po samym \`is_closed()\`.
- Raport ma kolejność przyjęcia przez odbiornik, choć dzieci mogą kończyć się inaczej. Publiczne \`Job.id\` nie muszą być unikalne; nie wolno użyć ich jako jedynego klucza dołączenia wyników. Wewnętrzny identyfikator zadania pozwala przypisać również panic do właściwej pozycji.
- Pusta kolejka zamyka się poprawnie. Błąd jednego dziecka nie usuwa wyników innych. Błąd samego managera jest osobnym \`Err(JoinError)\` z \`shutdown\`; nie udaj wtedy kompletnego raportu.

## Granice

Ograniczamy bufor i pracę w toku. Raport zachowuje wszystkie wyniki w Vec, więc całkowita pamięć rośnie z liczbą zadań. Rozszerzenie na strumień wyników wymaga osobnego protokołu odbioru i backpressure.

Timeout nie wywłaszcza blokującego kodu ani Future, który długo nie oddaje sterowania. Nie cofa zewnętrznych efektów. Długie CPU, blokujące I/O oraz retry z efektami wymagają dalszych decyzji architektonicznych. Zwykłe porzucenie Pipeline wysyła sygnał przez zamknięcie oneshot, lecz odłącza JoinHandle managera; dopiero oczekiwanie na shutdown potwierdza zakończenie. Anulowanie oczekiwania na shutdown również nie potwierdza zakończenia.

## Kontrpróby i transfer

1. Zastąp reserve przez send po wcześniejszym take. Test anulowanej rezerwacji powinien wykryć utratę danych.
2. Pobieraj i uruchamiaj wszystkie wiadomości bez sprawdzania parallelism. Test z kanałami release powinien ujawnić złamany limit.
3. Zakończ po close bez drain albo zwróć wyniki w kolejności join. Testy przyjętych wiadomości i wcześniejszego Permit powinny wykazać błąd.
4. Podaj dwa identyczne Job.id i nie-Copy błąd. Wyjaśnij, dlaczego publiczny identyfikator nie wystarcza do przechowania wszystkich wyników.
5. Zaprojektuj strumieniowy raport i politykę dla klienta, który nie odbiera wyników. Najpierw zapisz niezmiennik oraz odpowiedzialność za każde dziecko w ADR.md.

Źródła sprawdzone 12 września 2026: [mpsc Sender](https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Sender.html), [Receiver](https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/struct.Receiver.html), [timeout](https://docs.rs/tokio/1.53.1/tokio/time/fn.timeout.html), [JoinSet](https://docs.rs/tokio/1.53.1/tokio/task/struct.JoinSet.html), [select](https://docs.rs/tokio/1.53.1/tokio/macro.select.html).
`,
    },
    {
      path: "ADR.md",
      starter: `# ADR: kto odpowiada za przyjętą pracę?

Status: uzasadnienie referencyjnego laboratorium. Dopisz własny kontrprzykład i alternatywę przed odsłonięciem src/lib.rs.

## Własność i granice

Producent zachowuje Job w swoim Option, dopóki nie uzyska Permit. Manager posiada Receiver i JoinSet. Po przyjęciu wiadomości zapisuje wewnętrzną tożsamość dziecka i pozycję w raporcie. Dziecko posiada wartość i Future przetwarzania. Każdy wynik, także panic, wraca do managera. Publiczny Job.id jest etykietą, nie unikalnym kluczem zasobu.

Jeden limit chroni bufor, drugi liczbę zadań. Manager nie pobiera pracy, gdy wszystkie miejsca są zajęte. Celowo nie tworzy najpierw nieograniczonej liczby zadań czekających na semafor. Odrębny problem to rozmiar całego raportu; obecny Vec nie daje stałej całkowitej pamięci.

## Zamknięcie

Select ma jawny biased priorytet: najpierw stop, potem gotowy wynik, potem nowe wejście. Gałąź stop jest wyłączana po pierwszej obserwacji, by stale gotowy kanał nie zagłodził drain. Join może chwilowo wyprzedzać wejście, ale dzieci jest skończenie wiele i każdy join usuwa jedno. Wcześniejsze Permit są częścią zobowiązania przyjęcia; oczekujemy na recv aż do None.

Każde dziecko ma własny timeout posiadanego Future. Nie nakładamy timeoutu na JoinHandle, po którym uznalibyśmy dziecko za skończone. Normalny shutdown nie abortuje JoinSet i nie kończy na pierwszym JoinError. Shutdown zwraca kompletny raport dopiero po drain i join. Sam Drop nie może awaitować tego protokołu.

## Odrzucone skróty

- Unbounded channel ukrywa przeciążenie w pamięci.
- Task na każdą wiadomość przed ograniczeniem równoległości przenosi problem z bufora do zadań.
- Timeout uchwytu ogranicza tylko oczekiwanie i może pozostawić niezależną pracę.
- \`join_all\` nie zachowuje wszystkich wyników przy pierwszym panic; ręczna pętla pozwala zachować błędy i ich tożsamość.
- Przyjęcie close jako dowodu pustego bufora gubi zaakceptowane dane i wcześniejsze Permit.

## Następna decyzja

Jak zmienić kontrakt przy strumieniu wyników, retry i zewnętrznych efektach? Określ, co znaczy przyjęcie, kiedy wolno ponowić operację, kto odbiera błąd i co ma się stać po przerwaniu klienta. Nie zakładaj, że timeout cofa zapis do zewnętrznego systemu.
`,
    },
    {
      path: "Cargo.toml",
      starter: `[package]
name = "tokio-pipeline-workshop"
version = "0.1.0"
edition = "2024"
publish = false

[dependencies]
tokio = { version = "=1.53.1", default-features = false, features = ["macros", "rt", "sync", "time"] }

[dev-dependencies]
tokio = { version = "=1.53.1", default-features = false, features = ["test-util"] }
`,
    },
    {
      path: "Cargo.lock",
      starter: `# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 4

[[package]]
name = "pin-project-lite"
version = "0.2.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a89322df9ebe1c1578d689c92318e070967d1042b512afbe49518723f4e6d5cd"

[[package]]
name = "proc-macro2"
version = "1.0.107"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "985e7ec9bb745e6ce6535b544d84d6cd6f7ad8bd711c398938ae983b91a766d9"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "quote"
version = "1.0.47"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1fbf4db142a473a8d80c26bbf18454ed458bf8d26c8219c331daecfdbd079001"
dependencies = [
 "proc-macro2",
]

[[package]]
name = "syn"
version = "3.0.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "12df2e0110f65b775f769bb17ef989067a1d931b2eb822bd4346631eeada89f9"
dependencies = [
 "proc-macro2",
 "quote",
 "unicode-ident",
]

[[package]]
name = "tokio"
version = "1.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "202caea871b69668250d242070849eb495be178ed697a3e98aebce5bc81a0bed"
dependencies = [
 "pin-project-lite",
 "tokio-macros",
]

[[package]]
name = "tokio-macros"
version = "2.7.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "78773a2a397f451582ce068015985c33193cf6dea8b74d2a639fe457b2f07b0e"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "tokio-pipeline-workshop"
version = "0.1.0"
dependencies = [
 "tokio",
]

[[package]]
name = "unicode-ident"
version = "1.0.24"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e6e4313cd5fcd3dad5cafa179702e2b244f760991f45397d14d4ebf38247da75"
`,
    },
    {
      path: "src/lib.rs",
      starter: `use std::{future::Future, num::NonZeroUsize, sync::Arc, time::Duration};
use tokio::{
    sync::{mpsc, oneshot},
    task::{JoinError, JoinHandle},
};

#[derive(Debug)]
pub struct Job<T> {
    pub id: u64,
    pub value: T,
}

#[derive(Debug, PartialEq, Eq)]
pub enum EnqueueError {
    Closed,
}

pub struct Config {
    pub capacity: NonZeroUsize,
    pub parallelism: NonZeroUsize,
    pub job_timeout: Duration,
}

#[derive(Debug)]
pub enum Outcome<U, E> {
    Completed(U),
    Rejected(E),
    TimedOut,
    JoinFailure(JoinError),
}

#[derive(Debug)]
pub struct JobReport<U, E> {
    pub id: u64,
    pub outcome: Outcome<U, E>,
}

pub struct Pipeline<T, U, E> {
    input: mpsc::Sender<Job<T>>,
    stop: oneshot::Sender<()>,
    manager: JoinHandle<Vec<JobReport<U, E>>>,
}

impl<T, U, E> Pipeline<T, U, E> {
    pub fn sender(&self) -> mpsc::Sender<Job<T>> {
        self.input.clone()
    }

    pub async fn shutdown(self) -> Result<Vec<JobReport<U, E>>, JoinError> {
        let Self {
            input,
            stop,
            manager,
        } = self;
        let _ = stop.send(());
        drop(input);
        manager.await
    }
}

/// Reserve before taking the caller's value; cancellation leaves it in \`pending\`.
pub async fn enqueue<T>(
    sender: &mpsc::Sender<Job<T>>,
    pending: &mut Option<Job<T>>,
) -> Result<(), EnqueueError> {
    let _ = (sender, pending);
    todo!("reserve capacity before consuming the pending job")
}

pub fn spawn_pipeline<T, U, E, F, Fut>(config: Config, process: F) -> Pipeline<T, U, E>
where
    T: Send + 'static,
    U: Send + 'static,
    E: Send + 'static,
    F: Fn(T) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<U, E>> + Send + 'static,
{
    let _ = (config, process);
    todo!("bound admission and tasks, then close, drain and join")
}

async fn run_pipeline<T, U, E, F, Fut>(
    mut receiver: mpsc::Receiver<Job<T>>,
    mut stopped: oneshot::Receiver<()>,
    config: Config,
    process: Arc<F>,
) -> Vec<JobReport<U, E>>
where
    T: Send + 'static,
    U: Send + 'static,
    E: Send + 'static,
    F: Fn(T) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<U, E>> + Send + 'static,
{
    let _ = (receiver, stopped, config, process);
    todo!("close admission, drain and join every child")
}

#[cfg(test)]
mod manager_tests;
`,
      solution: `use std::{collections::HashMap, future::Future, num::NonZeroUsize, sync::Arc, time::Duration};
use tokio::{
    sync::{mpsc, oneshot},
    task::{JoinError, JoinHandle, JoinSet},
};

#[derive(Debug)]
pub struct Job<T> {
    pub id: u64,
    pub value: T,
}

#[derive(Debug, PartialEq, Eq)]
pub enum EnqueueError {
    Closed,
}

pub struct Config {
    pub capacity: NonZeroUsize,
    pub parallelism: NonZeroUsize,
    pub job_timeout: Duration,
}

#[derive(Debug)]
pub enum Outcome<U, E> {
    Completed(U),
    Rejected(E),
    TimedOut,
    JoinFailure(JoinError),
}

#[derive(Debug)]
pub struct JobReport<U, E> {
    pub id: u64,
    pub outcome: Outcome<U, E>,
}

pub struct Pipeline<T, U, E> {
    input: mpsc::Sender<Job<T>>,
    stop: oneshot::Sender<()>,
    manager: JoinHandle<Vec<JobReport<U, E>>>,
}

impl<T, U, E> Pipeline<T, U, E> {
    pub fn sender(&self) -> mpsc::Sender<Job<T>> {
        self.input.clone()
    }

    pub async fn shutdown(self) -> Result<Vec<JobReport<U, E>>, JoinError> {
        let Self {
            input,
            stop,
            manager,
        } = self;
        let _ = stop.send(());
        drop(input);
        manager.await
    }
}

/// Reserve before taking the caller's value; cancellation leaves it in \`pending\`.
pub async fn enqueue<T>(
    sender: &mpsc::Sender<Job<T>>,
    pending: &mut Option<Job<T>>,
) -> Result<(), EnqueueError> {
    if pending.is_none() {
        return Ok(());
    }
    let permit = sender.reserve().await.map_err(|_| EnqueueError::Closed)?;
    // There is no await between taking ownership and publishing the job.
    permit.send(
        pending
            .take()
            .expect("pending was checked before reservation"),
    );
    Ok(())
}

pub fn spawn_pipeline<T, U, E, F, Fut>(config: Config, process: F) -> Pipeline<T, U, E>
where
    T: Send + 'static,
    U: Send + 'static,
    E: Send + 'static,
    F: Fn(T) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<U, E>> + Send + 'static,
{
    let (input, receiver) = mpsc::channel::<Job<T>>(config.capacity.get());
    let (stop, stopped) = oneshot::channel();
    let process = Arc::new(process);
    let manager = tokio::spawn(run_pipeline(receiver, stopped, config, process));
    Pipeline {
        input,
        stop,
        manager,
    }
}

async fn run_pipeline<T, U, E, F, Fut>(
    mut receiver: mpsc::Receiver<Job<T>>,
    mut stopped: oneshot::Receiver<()>,
    config: Config,
    process: Arc<F>,
) -> Vec<JobReport<U, E>>
where
    T: Send + 'static,
    U: Send + 'static,
    E: Send + 'static,
    F: Fn(T) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<U, E>> + Send + 'static,
{
    let mut tasks = JoinSet::new();
    let mut identities = HashMap::new();
    let mut reports = Vec::new();
    let mut next_ordinal = 0usize;
    let mut accepting = true;
    let mut input_done = false;
    while !input_done || !tasks.is_empty() {
        tokio::select! {
            biased;
            // Closed oneshot also requests shutdown if the Pipeline is dropped.
            _ = &mut stopped, if accepting => {
                accepting = false;
                receiver.close();
            }
            joined = tasks.join_next_with_id(), if !tasks.is_empty() => {
                let (task_id, outcome) = match joined.expect("nonempty JoinSet") {
                    Ok((task_id, outcome)) => (task_id, outcome),
                    Err(error) => (error.id(), Outcome::JoinFailure(error)),
                };
                let (ordinal, id) = identities.remove(&task_id).expect("every child has an identity");
                reports.push((ordinal, JobReport { id, outcome }));
            }
            job = receiver.recv(), if !input_done && tasks.len() < config.parallelism.get() => {
                match job {
                    Some(Job { id, value }) => {
                        let process = process.clone();
                        let handle = tasks.spawn(async move {
                            // Construct inside the child: even a factory panic has a task id.
                            match tokio::time::timeout(config.job_timeout, async move { process(value).await }).await {
                                Ok(Ok(value)) => Outcome::Completed(value),
                                Ok(Err(error)) => Outcome::Rejected(error),
                                Err(_) => Outcome::TimedOut,
                            }
                        });
                        identities.insert(handle.id(), (next_ordinal, id));
                        next_ordinal += 1;
                    }
                    None => input_done = true,
                }
            }
        }
    }
    reports.sort_by_key(|(ordinal, _)| *ordinal);
    reports.into_iter().map(|(_, report)| report).collect()
}

#[cfg(test)]
mod manager_tests;
`,
    },
    {
      path: "src/manager_tests.rs",
      starter: `use super::*;
use std::{future::poll_fn, pin::pin, task::Poll};

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn stop_closes_admission_before_waiting_for_an_old_permit() {
    let config = Config {
        capacity: NonZeroUsize::new(1).unwrap(),
        parallelism: NonZeroUsize::new(1).unwrap(),
        job_timeout: Duration::from_secs(10),
    };
    let (sender, receiver) = mpsc::channel::<Job<String>>(1);
    let permit = sender.reserve().await.unwrap();
    let (stop, stopped) = oneshot::channel();
    stop.send(()).unwrap();
    let process = Arc::new(|value: String| async { Ok::<_, String>(value) });
    let mut manager = pin!(run_pipeline(receiver, stopped, config, process));
    poll_fn(|cx| {
        assert!(
            manager.as_mut().poll(cx).is_pending(),
            "an old permit still exists"
        );
        Poll::Ready(())
    })
    .await;
    assert!(
        sender.is_closed(),
        "stop must close admission before drain waits"
    );
    let rejected = sender
        .try_send(Job {
            id: 9,
            value: "late".into(),
        })
        .unwrap_err();
    assert!(matches!(
        rejected,
        mpsc::error::TrySendError::Closed(Job { id: 9, .. })
    ));
    drop(permit);
    poll_fn(|cx| {
        match manager.as_mut().poll(cx) {
            Poll::Ready(report) => assert!(report.is_empty()),
            Poll::Pending => panic!("no input or child remains after the permit is dropped"),
        }
        Poll::Ready(())
    })
    .await;
}
`,
    },
    {
      path: "tests/contract.rs",
      starter: `use std::{
    future::{Future, pending, poll_fn},
    num::NonZeroUsize,
    pin::pin,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    task::Poll,
    time::Duration,
};
use tokio::sync::{mpsc, oneshot};
use tokio_pipeline_workshop::{Config, EnqueueError, Job, Outcome, enqueue, spawn_pipeline};

fn config(capacity: usize, parallelism: usize, seconds: u64) -> Config {
    Config {
        capacity: NonZeroUsize::new(capacity).unwrap(),
        parallelism: NonZeroUsize::new(parallelism).unwrap(),
        job_timeout: Duration::from_secs(seconds),
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn cancelled_reservation_retains_the_non_copy_job() {
    let (sender, mut receiver) = mpsc::channel(1);
    sender
        .send(Job {
            id: 1,
            value: String::from("occupied"),
        })
        .await
        .unwrap();
    let mut pending_job = Some(Job {
        id: 2,
        value: String::from("keep me"),
    });
    {
        let mut attempt = pin!(enqueue(&sender, &mut pending_job));
        poll_fn(|cx| {
            assert!(
                attempt.as_mut().poll(cx).is_pending(),
                "full buffer must wait"
            );
            Poll::Ready(())
        })
        .await;
    }
    assert_eq!(pending_job.as_ref().unwrap().value, "keep me");
    assert_eq!(receiver.recv().await.unwrap().id, 1);
    enqueue(&sender, &mut pending_job).await.unwrap();
    assert!(pending_job.is_none());
    assert_eq!(receiver.recv().await.unwrap().value, "keep me");
    receiver.close();
    let mut none = None;
    assert_eq!(enqueue(&sender, &mut none).await, Ok(()));
    let mut rejected = Some(Job {
        id: 3,
        value: String::from("recover"),
    });
    assert_eq!(
        enqueue(&sender, &mut rejected).await,
        Err(EnqueueError::Closed)
    );
    assert_eq!(rejected.unwrap().value, "recover");
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn empty_shutdown_closes_cloned_senders() {
    let pipeline = spawn_pipeline(config(2, 3, 10), |value: String| async {
        Ok::<_, String>(value)
    });
    let sender = pipeline.sender();
    assert!(pipeline.shutdown().await.unwrap().is_empty());
    let error = sender
        .send(Job {
            id: 7,
            value: String::from("late"),
        })
        .await
        .unwrap_err();
    assert_eq!(error.0.value, "late");
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn all_accepted_jobs_are_drained_in_admission_order() {
    let pipeline = spawn_pipeline(config(4, 2, 10), |value: String| async {
        Ok::<_, String>(value + "!")
    });
    let sender = pipeline.sender();
    for (id, value) in [
        (8, "first"),
        (8, "second"),
        (0, "third"),
        (u64::MAX, "last"),
    ] {
        sender
            .send(Job {
                id,
                value: value.into(),
            })
            .await
            .unwrap();
    }
    let reports = pipeline.shutdown().await.unwrap();
    assert_eq!(
        reports.iter().map(|report| report.id).collect::<Vec<_>>(),
        [8, 8, 0, u64::MAX]
    );
    let values = reports
        .into_iter()
        .map(|report| match report.outcome {
            Outcome::Completed(value) => value,
            other => panic!("lost successful job: {other:?}"),
        })
        .collect::<Vec<_>>();
    assert_eq!(values, ["first!", "second!", "third!", "last!"]);
    assert!(sender.is_closed());
}

#[derive(Debug)]
struct Payload(String);

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn domain_errors_and_panic_payloads_keep_their_job_identity() {
    let pipeline = spawn_pipeline(config(3, 3, 10), |value: usize| {
        // This is deliberately before the async block: factory panics are child outcomes too.
        if value == 2 {
            std::panic::panic_any(Payload("factory panic".into()));
        }
        async move {
            if value == 1 {
                Err(Payload("domain error".into()))
            } else {
                Ok(Payload("success".into()))
            }
        }
    });
    let sender = pipeline.sender();
    for value in 0..3 {
        sender
            .send(Job {
                id: value as u64 + 40,
                value,
            })
            .await
            .unwrap();
    }
    let mut reports = pipeline.shutdown().await.unwrap().into_iter();
    let first = reports.next().unwrap();
    assert_eq!(first.id, 40);
    assert!(matches!(first.outcome, Outcome::Completed(Payload(text)) if text == "success"));
    let second = reports.next().unwrap();
    assert_eq!(second.id, 41);
    assert!(matches!(second.outcome, Outcome::Rejected(Payload(text)) if text == "domain error"));
    let third = reports.next().unwrap();
    assert_eq!(third.id, 42);
    match third.outcome {
        Outcome::JoinFailure(error) => {
            assert!(error.is_panic());
            let payload = error.into_panic().downcast::<Payload>().unwrap();
            assert_eq!(payload.0, "factory panic");
        }
        other => panic!("lost JoinError: {other:?}"),
    }
    assert!(reports.next().is_none());
}

struct Active(Arc<AtomicUsize>);
impl Drop for Active {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::SeqCst);
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn sharing_the_factory_never_calls_its_user_defined_clone() {
    struct ClonePanic(Arc<AtomicUsize>);
    impl Clone for ClonePanic {
        fn clone(&self) -> Self {
            panic!("the factory must be shared, not cloned");
        }
    }
    impl ClonePanic {
        fn observe(&self) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }
    let calls = Arc::new(AtomicUsize::new(0));
    let captured = ClonePanic(calls.clone());
    let pipeline = spawn_pipeline(config(2, 2, 10), move |value: String| {
        captured.observe();
        async { Ok::<_, String>(value) }
    });
    for id in 0..2 {
        pipeline
            .sender()
            .send(Job {
                id,
                value: format!("job {id}"),
            })
            .await
            .unwrap();
    }
    let reports = pipeline.shutdown().await.expect("every child has a report");
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert_eq!(reports.len(), 2);
    assert!(reports.into_iter().all(|report| matches!(report.outcome, Outcome::Completed(value) if value == format!("job {}", report.id))));
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn timeout_drops_owned_work_and_uses_the_callers_duration() {
    for seconds in [3, 17] {
        let active = Arc::new(AtomicUsize::new(0));
        let observed = active.clone();
        let pipeline = spawn_pipeline(config(1, 1, seconds), move |(): ()| {
            let observed = observed.clone();
            async move {
                observed.fetch_add(1, Ordering::SeqCst);
                let _guard = Active(observed);
                pending::<Result<String, String>>().await
            }
        });
        pipeline
            .sender()
            .send(Job { id: 91, value: () })
            .await
            .unwrap();
        let start = tokio::time::Instant::now();
        let reports = pipeline.shutdown().await.unwrap();
        assert_eq!(start.elapsed(), Duration::from_secs(seconds));
        assert_eq!(reports.len(), 1);
        assert_eq!(reports[0].id, 91);
        assert!(matches!(reports[0].outcome, Outcome::TimedOut));
        assert_eq!(
            active.load(Ordering::SeqCst),
            0,
            "shutdown must not detach owned work"
        );
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn delayed_success_is_not_replaced_with_an_immediate_deadline() {
    let pipeline = spawn_pipeline(config(1, 1, 20), |value: String| async move {
        tokio::time::sleep(Duration::from_secs(7)).await;
        Ok::<_, String>(value)
    });
    pipeline
        .sender()
        .send(Job {
            id: 3,
            value: "ready later".into(),
        })
        .await
        .unwrap();
    let start = tokio::time::Instant::now();
    let report = pipeline.shutdown().await.unwrap().pop().unwrap();
    assert_eq!(start.elapsed(), Duration::from_secs(7));
    assert!(matches!(report.outcome, Outcome::Completed(value) if value == "ready later"));
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn buffer_and_in_flight_tasks_have_separate_bounds() {
    let active = Arc::new(AtomicUsize::new(0));
    let peak = Arc::new(AtomicUsize::new(0));
    let (started, mut starts) = mpsc::unbounded_channel();
    let observed = active.clone();
    let high = peak.clone();
    let pipeline = spawn_pipeline(
        config(1, 2, 60),
        move |(label, release): (usize, oneshot::Receiver<()>)| {
            let observed = observed.clone();
            let high = high.clone();
            let started = started.clone();
            async move {
                let count = observed.fetch_add(1, Ordering::SeqCst) + 1;
                let _guard = Active(observed);
                high.fetch_max(count, Ordering::SeqCst);
                started.send(label).unwrap();
                release.await.unwrap();
                Ok::<_, String>(label)
            }
        },
    );
    let sender = pipeline.sender();
    let mut releases = Vec::new();
    for label in 0..2 {
        let (release, wait) = oneshot::channel();
        releases.push(release);
        sender
            .send(Job {
                id: label as u64,
                value: (label, wait),
            })
            .await
            .unwrap();
        assert_eq!(starts.recv().await, Some(label));
    }
    let (release, wait) = oneshot::channel();
    sender
        .try_send(Job {
            id: 2,
            value: (2, wait),
        })
        .unwrap();
    let (_fourth, wait) = oneshot::channel();
    let error = sender
        .try_send(Job {
            id: 3,
            value: (3, wait),
        })
        .unwrap_err();
    assert!(matches!(error, mpsc::error::TrySendError::Full(_)));
    let manager = tokio::spawn(pipeline.shutdown());
    sender.closed().await;
    assert_eq!(active.load(Ordering::SeqCst), 2);
    assert!(
        starts.try_recv().is_err(),
        "must not prefetch and spawn unbounded work"
    );
    releases.pop().unwrap().send(()).unwrap();
    assert_eq!(starts.recv().await, Some(2));
    release.send(()).unwrap();
    releases.pop().unwrap().send(()).unwrap();
    let reports = manager.await.unwrap().unwrap();
    assert_eq!(
        reports.iter().map(|item| item.id).collect::<Vec<_>>(),
        [0, 1, 2]
    );
    assert_eq!(peak.load(Ordering::SeqCst), 2);
    assert_eq!(active.load(Ordering::SeqCst), 0);
    assert!(
        reports.into_iter().all(
            |item| matches!(item.outcome, Outcome::Completed(value) if value as u64 == item.id)
        )
    );
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn an_outstanding_permit_is_drained_even_after_close() {
    let pipeline = spawn_pipeline(config(1, 1, 10), |value: String| async {
        Ok::<_, String>(value)
    });
    let sender = pipeline.sender();
    let permit = sender.reserve().await.unwrap();
    let manager = tokio::spawn(pipeline.shutdown());
    sender.closed().await;
    assert!(
        !manager.is_finished(),
        "reserved capacity can still deliver a job"
    );
    permit.send(Job {
        id: 5,
        value: "reserved earlier".into(),
    });
    let reports = manager.await.unwrap().unwrap();
    assert_eq!(reports.len(), 1);
    assert!(
        matches!(&reports[0].outcome, Outcome::Completed(value) if value == "reserved earlier")
    );
}
`,
    },
  ],
};

export const tokioPipelineProject: ProjectContract = {
  id: "tokio-pipeline",
  title: "Laboratorium: pipeline Tokio",
  objective:
    "Rozlicz każdą przyjętą wiadomość, także przy przeciążeniu, błędzie dziecka i zamykaniu wejścia.",
  lessonId: "tokio-bounded-channels",
  lessonIds: [
    "tokio-bounded-channels",
    "tokio-reservation-cancellation",
    "tokio-timeouts",
    "tokio-select-cancellation",
    "tokio-graceful-shutdown",
  ],
  reviewConceptIds: [
    "tokio-bounded-channels",
    "tokio-reservation-cancellation",
    "tokio-timeouts",
    "tokio-select-cancellation",
    "tokio-graceful-shutdown",
  ],
  requiredBehaviors: [
    "Bufor i liczba aktywnych zadań mają osobne dodatnie limity.",
    "Rezerwacja zachowuje niesłaną wiadomość przy anulowaniu i zamknięciu.",
    "Deadline dotyczy posiadanego Future każdego dziecka; raport zachowuje sukcesy, błędy domeny i pełny JoinError.",
    "Zamknięcie zatrzymuje nowe send, opróżnia przyjęte dane i wcześniejsze Permit oraz odbiera wszystkie wyniki.",
    "Raport ma kolejność przyjęcia, także przy powtórzonych publicznych identyfikatorach.",
  ],
  requiredEvidence: [
    "Testy Cargo, rustfmt i Clippy dla rozwiązania oraz oczekiwana porażka niedokończonego startera.",
    "Bezpośrednie asercje pojemności, aktywnej pracy, zamknięcia i odzyskania nie-Copy danych; testy czasu z zegarem Tokio.",
    "Własne uzasadnienie limitów pamięci, anulowania i granic timeoutu w ADR.",
  ],
  constraints: [
    "Bez unsafe, blokowania wątków i założeń o kolejności schedulera.",
    "Nie uznawaj Drop JoinHandle, timeoutu uchwytu ani pierwszego błędu za zakończenie wszystkich dzieci.",
    "Limit bufora nie ogranicza rozmiaru całego raportu. Timeout nie cofa zewnętrznych efektów.",
  ],
  adversarialLessonId: "tokio-graceful-shutdown",
  adversarialInject:
    "Producent ma Permit sprzed zamknięcia, dwa zadania mają ten sam publiczny id, a jedno panikuje. Zachowaj wszystkie przyjęte dane i przypisz każdy wynik. Potem zaprojektuj raport wysyłany strumieniowo.",
  retrospective: [
    "Kto posiada wiadomość podczas oczekiwania na miejsce i po anulowaniu?",
    "Które zdarzenie dowodzi zakończenia wszystkich dzieci, a które tylko końca oczekiwania?",
    "Jakie zasoby nadal mogą rosnąć mimo bounded queue i kiedy timeout nie pomoże?",
  ],
  package: tokioPipelinePackage,
};
