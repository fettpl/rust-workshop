import type { ProjectContract, ProjectPackage } from "../../domain/types";
import { durableLogServicePackage } from "./durable-log-service/archive";

export const durableLogRetryPrimaryStepRefs = [
  { lessonId: "service-client-bounded-retry", stepId: "service-client-retry-next-action" },
  { lessonId: "service-client-bounded-retry", stepId: "service-client-retry-budget-reservation" },
  { lessonId: "service-client-ambiguous-driver", stepId: "service-client-immutable-frame-replay" },
  { lessonId: "service-client-ambiguous-driver", stepId: "service-client-aggregate-uncertainty" },
] as const;

const inheritedReferenceFiles: ProjectPackage["files"] = durableLogServicePackage.files.map((file) => ({
  path: file.path,
  starter: file.solution ?? file.starter,
  solution: file.solution ?? file.starter,
}));

// MIT-associated executable Rust region: the starter and solution below are
// authored programming examples shipped in the Cargo archive.
const retryClientStarter = String.raw`#![forbid(unsafe_code)]

use std::time::Duration;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_attempts: u32,
    pub global_deadline: Duration,
    pub per_attempt: Duration,
    pub backoff: Duration,
}

pub fn next_action(_policy: &RetryPolicy, _now: u64, _attempts: u32) {
    todo!("zdefiniuj walidację budżetu, wspólny deadline i następne działanie");
}

// TODO: zdefiniuj parser receipt/ERR i agregację Unknown.
`;

const retryClientSolution = String.raw`#![forbid(unsafe_code)]

use ingest_core::{Event, encode_v1, encode_v2};
use std::{net::SocketAddr, time::Duration};
use tokio::{
    io::{AsyncRead, AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::{Instant, sleep_until, timeout_at},
};

pub const MAX_RESPONSE_BYTES: usize = 128;
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_attempts: u32,
    pub global_deadline: Duration,
    pub per_attempt: Duration,
    pub backoff: Duration,
}
pub struct RetryClient {
    pub addr: SocketAddr,
    pub policy: RetryPolicy,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StopReason {
    Terminal,
    AttemptLimit,
    Deadline,
    BackoffOverflow,
    InvalidPolicy,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Refusal {
    QueueFull,
    Busy,
    Conflict,
    Full,
    Schema,
    TooLarge,
    Utf8,
    Version,
    Fields,
    Validation,
    Storage,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Receipt {
    pub sequence: u64,
    pub duplicate: bool,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Observation {
    Receipt(Receipt),
    Refusal(Refusal),
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParseError {
    Malformed,
    Unrecognized,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LastObservation {
    Refusal(Refusal),
    Transport,
    Deadline,
    PrematureEof,
    Malformed,
    Unrecognized,
    Storage,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Final {
    Delivered {
        receipt: Receipt,
        attempts: u32,
    },
    Refused {
        reason: Refusal,
        stopped: StopReason,
        attempts: u32,
    },
    Unknown {
        last: LastObservation,
        stopped: StopReason,
        attempts: u32,
    },
    NotAttempted {
        stopped: StopReason,
    },
}

impl RetryClient {
    pub fn new(addr: SocketAddr, policy: RetryPolicy) -> Self {
        Self { addr, policy }
    }

    pub async fn send(&self, event: Event) -> Final {
        send_with_retry(self.addr, event, self.policy.clone()).await
    }
}

impl RetryPolicy {
    pub fn valid(&self) -> bool {
        self.max_attempts > 0
            && self.global_deadline != Duration::ZERO
            && self.per_attempt != Duration::ZERO
            && self.backoff != Duration::ZERO
    }
}

pub fn parse_response(bytes: &[u8]) -> Result<Observation, ParseError> {
    if bytes.is_empty()
        || bytes.len() > MAX_RESPONSE_BYTES
        || bytes.last() != Some(&b'\n')
        || bytes[..bytes.len() - 1].contains(&b'\n')
    {
        return Err(ParseError::Malformed);
    }
    let line = std::str::from_utf8(&bytes[..bytes.len() - 1]).map_err(|_| ParseError::Malformed)?;
    let fields: Vec<&str> = line.split('\t').collect();
    match fields.as_slice() {
        ["OK", sequence, disposition] => {
            let sequence = sequence
                .parse::<u64>()
                .ok()
                .filter(|n| *n > 0)
                .ok_or(ParseError::Malformed)?;
            let duplicate = match *disposition {
                "INSERTED" => false,
                "DUPLICATE" => true,
                _ => return Err(ParseError::Unrecognized),
            };
            Ok(Observation::Receipt(Receipt {
                sequence,
                duplicate,
            }))
        }
        ["ERR", reason] => Ok(Observation::Refusal(match *reason {
            "QUEUE_FULL" => Refusal::QueueFull,
            "BUSY" => Refusal::Busy,
            "CONFLICT" => Refusal::Conflict,
            "FULL" => Refusal::Full,
            "SCHEMA" => Refusal::Schema,
            "TOO_LARGE" => Refusal::TooLarge,
            "UTF8" => Refusal::Utf8,
            "VERSION" => Refusal::Version,
            "FIELDS" => Refusal::Fields,
            "VALIDATION" => Refusal::Validation,
            "STORAGE" => Refusal::Storage,
            _ => return Err(ParseError::Unrecognized),
        })),
        _ => Err(ParseError::Unrecognized),
    }
}

async fn read_response<R: AsyncRead + Unpin>(
    stream: &mut R,
    deadline: Instant,
) -> Result<Vec<u8>, LastObservation> {
    let mut response = Vec::new();
    let mut chunk = [0_u8; 32];
    loop {
        let count = timeout_at(deadline, stream.read(&mut chunk))
            .await
            .map_err(|_| LastObservation::Deadline)?
            .map_err(|_| LastObservation::Transport)?;
        if count == 0 {
            return if response.is_empty() {
                Err(LastObservation::PrematureEof)
            } else {
                Ok(response)
            };
        }
        if response
            .len()
            .checked_add(count)
            .filter(|size| *size <= MAX_RESPONSE_BYTES)
            .is_none()
        {
            return Err(LastObservation::Malformed);
        }
        response.extend_from_slice(&chunk[..count]);
    }
}

async fn one_attempt(
    addr: SocketAddr,
    frame: &[u8],
    deadline: Instant,
) -> Result<Observation, LastObservation> {
    let mut stream = timeout_at(deadline, TcpStream::connect(addr))
        .await
        .map_err(|_| LastObservation::Deadline)?
        .map_err(|_| LastObservation::Transport)?;
    timeout_at(deadline, stream.write_all(frame))
        .await
        .map_err(|_| LastObservation::Deadline)?
        .map_err(|_| LastObservation::Transport)?;
    let bytes = read_response(&mut stream, deadline).await?;
    parse_response(&bytes).map_err(|error| match error {
        ParseError::Malformed => LastObservation::Malformed,
        ParseError::Unrecognized => LastObservation::Unrecognized,
    })
}

fn stopped(
    last: Option<LastObservation>,
    unresolved: bool,
    reason: StopReason,
    attempts: u32,
) -> Final {
    if unresolved {
        return Final::Unknown {
            last: last.unwrap_or(LastObservation::PrematureEof),
            stopped: reason,
            attempts,
        };
    }
    match last {
        Some(LastObservation::Refusal(kind)) => Final::Refused {
            reason: kind,
            stopped: reason,
            attempts,
        },
        Some(observation) => Final::Unknown {
            last: observation,
            stopped: reason,
            attempts,
        },
        None => Final::NotAttempted { stopped: reason },
    }
}

pub fn shared_io_deadline(global: Instant, now: Instant, per_attempt: Duration) -> Option<Instant> {
    now.checked_add(per_attempt)
        .map(|per_attempt_deadline| std::cmp::min(global, per_attempt_deadline))
}

pub async fn send_with_retry(addr: SocketAddr, event: Event, policy: RetryPolicy) -> Final {
    if !policy.valid() {
        return Final::NotAttempted {
            stopped: StopReason::InvalidPolicy,
        };
    }
    let frame = match event.correlation() {
        Some(_) => encode_v2(&event),
        None => match encode_v1(&event) {
            Ok(bytes) => bytes,
            Err(_) => {
                return Final::NotAttempted {
                    stopped: StopReason::InvalidPolicy,
                };
            }
        },
    };
    let started = Instant::now();
    let global = match started.checked_add(policy.global_deadline) {
        Some(value) => value,
        None => {
            return Final::NotAttempted {
                stopped: StopReason::InvalidPolicy,
            };
        }
    };
    let mut attempts = 0;
    let mut last = None;
    let mut unresolved = false;
    loop {
        let now = Instant::now();
        if attempts >= policy.max_attempts {
            return stopped(last, unresolved, StopReason::AttemptLimit, attempts);
        }
        if now >= global {
            return stopped(last, unresolved, StopReason::Deadline, attempts);
        }
        let per_attempt_deadline = match shared_io_deadline(global, now, policy.per_attempt) {
            Some(value) => value,
            None => {
                return Final::NotAttempted {
                    stopped: StopReason::BackoffOverflow,
                };
            }
        };
        attempts += 1;
        let deadline = std::cmp::min(global, per_attempt_deadline);
        match one_attempt(addr, &frame, deadline).await {
            Ok(Observation::Receipt(receipt)) => return Final::Delivered { receipt, attempts },
            Ok(Observation::Refusal(Refusal::Storage)) => {
                return Final::Unknown {
                    last: LastObservation::Storage,
                    stopped: StopReason::Terminal,
                    attempts,
                };
            }
            Ok(Observation::Refusal(kind @ (Refusal::QueueFull | Refusal::Busy))) => {
                last = Some(LastObservation::Refusal(kind))
            }
            Ok(Observation::Refusal(kind)) => {
                last = Some(LastObservation::Refusal(kind));
                return stopped(last, unresolved, StopReason::Terminal, attempts);
            }
            Err(error @ (LastObservation::Malformed | LastObservation::Unrecognized)) => {
                last = Some(error);
                return stopped(last, unresolved, StopReason::Terminal, attempts);
            }
            Err(error) => {
                last = Some(error);
                unresolved = true;
            }
        }
        if attempts >= policy.max_attempts {
            return stopped(last, unresolved, StopReason::AttemptLimit, attempts);
        }
        let delay = match policy.backoff.checked_mul(attempts) {
            Some(value) => value,
            None => return stopped(last, unresolved, StopReason::BackoffOverflow, attempts),
        };
        let next = match Instant::now().checked_add(delay) {
            Some(value) => value,
            None => return stopped(last, unresolved, StopReason::BackoffOverflow, attempts),
        };
        if next >= global {
            sleep_until(global).await;
            return stopped(last, unresolved, StopReason::Deadline, attempts);
        }
        sleep_until(next).await;
        if Instant::now() >= global {
            return stopped(last, unresolved, StopReason::Deadline, attempts);
        }
    }
}
`;

// MIT-associated executable Rust region: binary starter/solution payloads
// remain programming examples covered by the software scope.
const retryBinaryStarter = String.raw`#![forbid(unsafe_code)]
fn main() {
    eprintln!("uzupełnij zamknięty klient retry");
}
`;
const retryBinarySolution = String.raw`#![forbid(unsafe_code)]
#[path = "../retry_client.rs"]
mod retry_client;
use ingest_core::{Event, Level};
use retry_client::{Final, RetryClient, RetryPolicy};
use std::{net::SocketAddr, time::Duration};
#[tokio::main(flavor = "current_thread")]
async fn main() {
    let mut args = std::env::args().skip(1);
    let addr: SocketAddr = args
        .next()
        .and_then(|value| value.parse().ok())
        .expect("addr");
    let event = Event::new(
        args.next().expect("source"),
        args.next().expect("key"),
        Level::Info,
        args.next().expect("message"),
    )
    .expect("event");
    let result = RetryClient::new(
        addr,
        RetryPolicy {
            max_attempts: 3,
            global_deadline: Duration::from_secs(5),
            per_attempt: Duration::from_secs(1),
            backoff: Duration::from_millis(10),
        },
    )
    .send(event)
    .await;
    match result {
        Final::Delivered { receipt, .. } => {
            println!("DELIVERED {} {}", receipt.sequence, receipt.duplicate)
        }
        Final::Refused { reason, .. } => println!("REFUSED {reason:?}"),
        Final::Unknown { last, .. } => println!("UNKNOWN {last:?}"),
        Final::NotAttempted { stopped } => println!("NOT_ATTEMPTED {stopped:?}"),
    }
}
`;

// MIT-associated executable Rust region: trusted native tests are executable
// fixtures, not learner-facing prose.
const retryTestStarter = String.raw`#![forbid(unsafe_code)]
#[test]
fn retry_contract_is_your_work() {
    todo!("zapisz parser, budżet i agregację Unknown");
}
`;
const retryTestSolution = String.raw`#![forbid(unsafe_code)]
#[path = "../src/retry_client.rs"]
mod retry_client;
use ingest_core::{Event, Level};
use ingest_service::{Config, serve};
use retry_client::{
    Final, Observation, ParseError, Receipt, Refusal, RetryClient, RetryPolicy, parse_response,
};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::{Instant, timeout};
async fn read_frame(stream: &mut tokio::net::TcpStream) -> Vec<u8> {
    let mut frame = Vec::new();
    let mut chunk = [0_u8; 256];
    loop {
        let count = stream.read(&mut chunk).await.unwrap();
        assert!(count > 0, "peer closed before a complete frame");
        frame.extend_from_slice(&chunk[..count]);
        if frame.contains(&b'\n') {
            return frame;
        }
    }
}
async fn injected_error_with_policy(reason: &'static [u8], max_attempts: u32) -> Final {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let _ = read_frame(&mut stream).await;
        stream.write_all(reason).await.unwrap();
    });
    let event = Event::new(
        "source".into(),
        "error-key".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts,
            global_deadline: Duration::from_secs(2),
            per_attempt: Duration::from_secs(1),
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    server.await.unwrap();
    result
}
async fn injected_error(reason: &'static [u8]) -> Final {
    injected_error_with_policy(reason, 1).await
}
#[test]
fn parser_covers_receipts_errors_and_boundary() {
    assert_eq!(
        parse_response(b"OK\t7\tINSERTED\n"),
        Ok(Observation::Receipt(Receipt {
            sequence: 7,
            duplicate: false
        }))
    );
    assert_eq!(
        parse_response(b"OK\t7\tDUPLICATE\n"),
        Ok(Observation::Receipt(Receipt {
            sequence: 7,
            duplicate: true
        }))
    );
    for (value, expected) in [
        ("QUEUE_FULL", Refusal::QueueFull),
        ("BUSY", Refusal::Busy),
        ("CONFLICT", Refusal::Conflict),
        ("FULL", Refusal::Full),
        ("SCHEMA", Refusal::Schema),
        ("TOO_LARGE", Refusal::TooLarge),
        ("UTF8", Refusal::Utf8),
        ("VERSION", Refusal::Version),
        ("FIELDS", Refusal::Fields),
        ("VALIDATION", Refusal::Validation),
        ("STORAGE", Refusal::Storage),
    ] {
        assert_eq!(
            parse_response(format!("ERR\t{value}\n").as_bytes()),
            Ok(Observation::Refusal(expected))
        );
    }
    assert_eq!(
        parse_response(b"OK\t0\tINSERTED\n"),
        Err(ParseError::Malformed)
    );
    assert_eq!(
        parse_response(b"OK\t1\tINSERTED\n\n"),
        Err(ParseError::Malformed)
    );
    assert_eq!(
        parse_response(b"ERR\tUNKNOWN\n"),
        Err(ParseError::Unrecognized)
    );
}
#[test]
fn invalid_policy_has_no_io_budget() {
    assert!(
        !RetryPolicy {
            max_attempts: 0,
            global_deadline: Duration::from_secs(1),
            per_attempt: Duration::from_secs(1),
            backoff: Duration::from_millis(1)
        }
        .valid()
    );
    assert!(
        !RetryPolicy {
            max_attempts: 1,
            global_deadline: Duration::ZERO,
            per_attempt: Duration::from_secs(1),
            backoff: Duration::from_millis(1)
        }
        .valid()
    );
}
#[tokio::test(flavor = "current_thread")]
async fn invalid_policy_returns_not_attempted_without_connecting() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let accepted = tokio::spawn(async move {
        timeout(Duration::from_millis(50), listener.accept())
            .await
            .is_ok()
    });
    let event = Event::new(
        "source".into(),
        "no-io".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts: 0,
            global_deadline: Duration::from_secs(1),
            per_attempt: Duration::from_secs(1),
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    assert!(!accepted.await.unwrap(), "invalid policy must not connect");
    assert_eq!(
        result,
        Final::NotAttempted {
            stopped: retry_client::StopReason::InvalidPolicy
        }
    );
}
#[test]
fn shared_deadline_bounds_connect_write_read_at_the_same_boundary() {
    let now = Instant::now();
    let global = now + Duration::from_secs(5);
    assert_eq!(
        retry_client::shared_io_deadline(global, now, Duration::from_secs(1)),
        Some(now + Duration::from_secs(1))
    );
    assert_eq!(
        retry_client::shared_io_deadline(global, now, Duration::from_secs(5)),
        Some(global)
    );
}
#[tokio::test(flavor = "current_thread")]
async fn lost_response_replays_identical_frame_and_accepts_duplicate_receipt() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut first, _) = listener.accept().await.unwrap();
        let mut first_frame = vec![0_u8; 256];
        let first_size = first.read(&mut first_frame).await.unwrap();
        first_frame.truncate(first_size);
        drop(first);
        let (mut second, _) = listener.accept().await.unwrap();
        let mut second_frame = vec![0_u8; 256];
        let second_size = second.read(&mut second_frame).await.unwrap();
        second_frame.truncate(second_size);
        assert_eq!(second_frame, first_frame);
        second.write_all(b"OK\t1\tDUPLICATE\n").await.unwrap();
    });
    let event = Event::new(
        "source".into(),
        "retry-key".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap()
    .with_correlation(Some("retry-correlation".into()))
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts: 2,
            global_deadline: Duration::from_secs(2),
            per_attempt: Duration::from_millis(500),
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    assert_eq!(
        result,
        Final::Delivered {
            receipt: Receipt {
                sequence: 1,
                duplicate: true
            },
            attempts: 2
        }
    );
    server.await.unwrap();
}
#[tokio::test(flavor = "current_thread")]
async fn real_service_proxy_drops_first_receipt_then_returns_duplicate() {
    let database =
        std::env::temp_dir().join(format!("retry-service-{}.sqlite", std::process::id()));
    let service_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let service_address = service_listener.local_addr().unwrap();
    let (shutdown, shutdown_receiver) = tokio::sync::oneshot::channel();
    let service = tokio::spawn(serve(
        service_listener,
        Config {
            bind: service_address,
            database: database.clone(),
            max_connections: 4,
            queue_capacity: 4,
            max_events: 8,
            frame_deadline: Duration::from_secs(2),
            drain_grace: Duration::from_secs(2),
        },
        shutdown_receiver,
    ));
    let proxy_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let proxy_address = proxy_listener.local_addr().unwrap();
    let proxy = tokio::spawn(async move {
        for attempt in 0..2 {
            let (mut frontend, _) = proxy_listener.accept().await.unwrap();
            let mut backend = tokio::net::TcpStream::connect(service_address)
                .await
                .unwrap();
            let frame = read_frame(&mut frontend).await;
            backend.write_all(&frame).await.unwrap();
            let mut response = Vec::new();
            backend.read_to_end(&mut response).await.unwrap();
            if attempt == 1 {
                frontend.write_all(&response).await.unwrap();
            }
        }
    });
    let event = Event::new(
        "source".into(),
        "service-key".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap()
    .with_correlation(Some("service-correlation".into()))
    .unwrap();
    let result = RetryClient::new(
        proxy_address,
        RetryPolicy {
            max_attempts: 2,
            global_deadline: Duration::from_secs(5),
            per_attempt: Duration::from_secs(2),
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    assert_eq!(
        result,
        Final::Delivered {
            receipt: Receipt {
                sequence: 1,
                duplicate: true
            },
            attempts: 2
        }
    );
    proxy.await.unwrap();
    shutdown.send(()).unwrap();
    let report = service.await.unwrap().unwrap();
    assert_eq!((report.inserted, report.duplicates), (1, 1));
    let _ = std::fs::remove_file(database);
}
#[tokio::test(flavor = "current_thread")]
async fn storage_is_terminal_unknown_and_queue_full_is_refused() {
    assert_eq!(
        injected_error(b"ERR\tSTORAGE\n").await,
        Final::Unknown {
            last: retry_client::LastObservation::Storage,
            stopped: retry_client::StopReason::Terminal,
            attempts: 1,
        }
    );
    assert_eq!(
        injected_error(b"ERR\tQUEUE_FULL\n").await,
        Final::Refused {
            reason: retry_client::Refusal::QueueFull,
            stopped: retry_client::StopReason::AttemptLimit,
            attempts: 1,
        }
    );
}
#[tokio::test(flavor = "current_thread")]
async fn malformed_response_is_terminal_unknown_without_replay() {
    assert_eq!(
        injected_error_with_policy(b"\xFF\n", 2).await,
        Final::Unknown {
            last: retry_client::LastObservation::Malformed,
            stopped: retry_client::StopReason::Terminal,
            attempts: 1,
        }
    );
    assert_eq!(
        injected_error_with_policy(b"ERR\tNOT_A_REAL_REASON\n", 2).await,
        Final::Unknown {
            last: retry_client::LastObservation::Unrecognized,
            stopped: retry_client::StopReason::Terminal,
            attempts: 1,
        }
    );
}
#[tokio::test(flavor = "current_thread")]
async fn all_busy_stops_at_attempt_limit() {
    assert_eq!(
        injected_error_with_policy(b"ERR\tBUSY\n", 1).await,
        Final::Refused {
            reason: retry_client::Refusal::Busy,
            stopped: retry_client::StopReason::AttemptLimit,
            attempts: 1,
        }
    );
}
#[tokio::test(flavor = "current_thread")]
async fn terminal_conflict_is_refused_without_uncertainty() {
    assert_eq!(
        injected_error_with_policy(b"ERR\tCONFLICT\n", 1).await,
        Final::Refused {
            reason: retry_client::Refusal::Conflict,
            stopped: retry_client::StopReason::Terminal,
            attempts: 1,
        }
    );
}
#[tokio::test(flavor = "current_thread")]
async fn prior_uncertainty_then_conflict_stays_unknown() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut first, _) = listener.accept().await.unwrap();
        let _ = read_frame(&mut first).await;
        drop(first);
        let (mut second, _) = listener.accept().await.unwrap();
        let _ = read_frame(&mut second).await;
        second.write_all(b"ERR\tCONFLICT\n").await.unwrap();
    });
    let event = Event::new(
        "source".into(),
        "sticky-unknown".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts: 2,
            global_deadline: Duration::from_secs(2),
            per_attempt: Duration::from_millis(500),
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    assert_eq!(
        result,
        Final::Unknown {
            last: retry_client::LastObservation::Refusal(retry_client::Refusal::Conflict),
            stopped: retry_client::StopReason::Terminal,
            attempts: 2,
        }
    );
    server.await.unwrap();
}
#[tokio::test(flavor = "current_thread")]
async fn backoff_deadline_overflow_stops_unknown_explicitly() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let _ = read_frame(&mut stream).await;
        drop(stream);
    });
    let event = Event::new(
        "source".into(),
        "backoff-overflow".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts: 2,
            global_deadline: Duration::from_secs(1),
            per_attempt: Duration::from_secs(1),
            backoff: Duration::MAX,
        },
    )
    .send(event)
    .await;
    assert_eq!(
        result,
        Final::Unknown {
            last: retry_client::LastObservation::PrematureEof,
            stopped: retry_client::StopReason::BackoffOverflow,
            attempts: 1,
        }
    );
    server.await.unwrap();
}
#[tokio::test(flavor = "current_thread")]
async fn per_attempt_deadline_overflow_is_not_attempted() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let accepted = tokio::spawn(async move {
        timeout(Duration::from_millis(50), listener.accept())
            .await
            .is_ok()
    });
    let event = Event::new(
        "source".into(),
        "overflow-key".into(),
        Level::Info,
        "message".into(),
    )
    .unwrap();
    let result = RetryClient::new(
        address,
        RetryPolicy {
            max_attempts: 1,
            global_deadline: Duration::from_secs(1),
            per_attempt: Duration::MAX,
            backoff: Duration::from_millis(1),
        },
    )
    .send(event)
    .await;
    assert!(!accepted.await.unwrap(), "overflow must not connect");
    assert_eq!(
        result,
        Final::NotAttempted {
            stopped: retry_client::StopReason::BackoffOverflow,
        }
    );
}
`;

// CC BY 4.0-authored teaching region: these worksheet strings are original
// Polish prompts and explanations, not executable Rust or third-party text.
const retryLabStarter = String.raw`# Laboratorium bounded retry

Opisz własne niezmienniki ramki, budżetu, backoffu, odpowiedzi i Unknown.
[uzupełnij]

## Pochodzenie i zakres licencji

Paczka zawiera 40 odziedziczonych plików trwałego dziennika jako jawną pomoc
referencyjną. Nowy klient retry nie jest zaimplementowany w tym starterze, a
pobranie ani przeczytanie rozwiązania nie oznacza ukończenia pracy ani nie
tworzy niezależnej historii. Trzy odziedziczone manifesty Cargo zachowują
wąski, wcześniejszy wyjątek MIT OR Apache-2.0; nowe pliki wykonywalne i testy
są przykładem kodu MIT, a ten opis jest materiałem dydaktycznym CC BY 4.0.
Paczka zachowuje odpowiednie teksty licencji i atrybucję.
`;
const retryLabSolution = String.raw`# Laboratorium bounded retry

Paczka zachowuje 40 plików trwałego dziennika jako jawny materiał referencyjny.
## Pochodzenie i zakres licencji

40 odziedziczonych plików pozostaje materiałem referencyjnym z istniejącego
projektu. Jego trzy manifesty Cargo zachowują wąski, wcześniejszy wyjątek
MIT OR Apache-2.0; ten wyjątek nie rozszerza się na repozytorium ani na nowe
pliki. Nowe pliki wykonywalne i testy tego laboratorium są przykładem kodu MIT,
a ten opis i karta pracy są autorskim materiałem dydaktycznym CC BY 4.0.
Paczka zachowuje odpowiednie teksty licencji i atrybucję; nie jest to pełna
ocena praw do żadnego zewnętrznego materiału.

Nowe pliki są lokalnym przykładem klienta z ograniczonym budżetem. Parser
rozróżnia receipt, odmowę, transport, deadline i nieznaną odpowiedź; STORAGE
pozostaje terminalnym Unknown, a wcześniejsza utrata odpowiedzi jest lepka aż
do prawidłowego receipt. Klient powtarza dokładnie te same bajty na nowym
połączeniu i nie używa receipt-query. TOO_LARGE jest poprawną odpowiedzią
serwisu, mimo że stary klient V1 ma węższą listę błędów; QUEUE_FULL i BUSY
pozostają retryable tylko w granicach wspólnego budżetu.
`;

const retryFiles: ProjectPackage["files"] = [
  ...inheritedReferenceFiles,
  { path: "crates/ingest-service/src/retry_client.rs", starter: retryClientStarter, solution: retryClientSolution },
  { path: "crates/ingest-service/src/bin/ingest-retry-client.rs", starter: retryBinaryStarter, solution: retryBinarySolution },
  { path: "crates/ingest-service/tests/retry_client.rs", starter: retryTestStarter, solution: retryTestSolution },
  { path: "RETRY-LAB.md", starter: retryLabStarter, solution: retryLabSolution },
];

export const durableLogRetryPackage: ProjectPackage = {
  id: "durable-log-retry-workspace",
  title: "Projekt: bounded retry klienta",
  description: "Lokalne laboratorium ograniczonej polityki retry nad trwałym dziennikiem zdarzeń.",
  instructions: [
    "Zachowaj identyczne bajty Event między próbami.",
    "Rozdziel receipt, odmowę, Unknown i NotAttempted.",
    "Zapisz rzeczywiste polecenia i ograniczenia dowodu loopback.",
    "40 odziedziczonych plików jest jawną pomocą referencyjną; pobranie nie oznacza ukończenia ani niezależnego dowodu.",
    "Nowe pliki wykonywalne i testy są kodem MIT, a opis RETRY-LAB jest materiałem CC BY 4.0; zachowaj istniejące atrybucje.",
  ],
  workspaceMembers: [...(durableLogServicePackage.workspaceMembers ?? [])],
  revealStepRefs: [...durableLogServicePackage.revealStepRefs, ...durableLogRetryPrimaryStepRefs],
  starterRevealStepRefs: [...durableLogServicePackage.revealStepRefs],
  files: retryFiles,
};

export const durableLogRetryProject: ProjectContract = {
  id: "durable-log-retry",
  title: "Bounded retry klienta",
  objective: "Zaprojektuj ograniczone powtórzenia bez gubienia niepewności receipt.",
  lessonIds: ["service-client-bounded-retry", "service-client-ambiguous-driver"],
  reviewConceptIds: ["service-client-retry-policy", "service-client-ambiguity-contract"],
  requiredBehaviors: [
    "powtarza identyczną ramkę wyłącznie w obrębie wspólnego budżetu",
    "rozróżnia Delivered, Refused, Unknown i NotAttempted",
    "zachowuje Unknown po utracie odpowiedzi aż do prawidłowego receipt",
  ],
  requiredEvidence: [
    "parser i testy granic odpowiedzi",
    "loopback proof obejmujący utratę odpowiedzi i DUPLICATE",
    "raport stabilny/MSRV z rzeczywistymi poleceniami i kodami wyjścia",
  ],
  constraints: [
    "bez receipt-query, bez nieograniczonych prób i bez nowych zależności",
    "STORAGE pozostaje terminalnym Unknown",
  ],
  lessonId: "service-client-bounded-retry",
  adversarialLessonId: "service-client-ambiguous-driver",
  adversarialInject: "utrata odpowiedzi po przyjęciu zdarzenia przed ponowną próbą",
  retrospective: [
    "Które zakończenia są rozstrzygające, a które tylko nieznane?",
    "Który dowód loopback odróżnia ponowienie od zapytania o receipt?",
  ],
  package: durableLogRetryPackage,
};
