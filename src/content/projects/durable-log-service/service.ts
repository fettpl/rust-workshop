import type { ProjectPackage } from "../../../domain/types";

export const serviceManifest = String.raw`[package]
name = "ingest-service"
version = "1.0.0"
edition = "2024"
rust-version = "1.85.0"
publish = false

[dependencies]
ingest-core = { path = "../ingest-core" }
ingest-store = { path = "../ingest-store" }
tokio = { version = "=1.54.1", default-features = false, features = ["macros", "rt", "sync", "time", "net", "io-util", "io-std"] }

[dev-dependencies]
tokio = { version = "=1.54.1", default-features = false, features = ["macros", "rt", "sync", "time", "net", "io-util", "io-std", "test-util"] }

[lints.rust]
unsafe_code = "forbid"
`;

const serviceLib = String.raw`#![forbid(unsafe_code)]

pub mod config;
pub mod server;
pub mod telemetry;
pub mod worker;

pub use config::{Config, ConfigError};
pub use server::{ServiceError, ShutdownReport, serve, serve_with_hooks};
pub use worker::{ReleaseGate, TestHooks};
`;

const config = String.raw`#![forbid(unsafe_code)]

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub bind: std::net::SocketAddr,
    pub database: std::path::PathBuf,
    pub max_connections: usize,
    pub queue_capacity: usize,
    pub max_events: usize,
    pub frame_deadline: std::time::Duration,
    pub drain_grace: std::time::Duration,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigError {
    ZeroConnections,
    TooManyConnections,
    ZeroQueue,
    ZeroEvents,
    NonLoopbackBind,
    ZeroFrameDeadline,
    ZeroDrainGrace,
    UnsupportedOption,
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::ZeroConnections => "max_connections must be positive",
            Self::TooManyConnections => "max_connections must be at most eight",
            Self::ZeroQueue => "queue_capacity must be positive",
            Self::ZeroEvents => "max_events must be positive",
            Self::NonLoopbackBind => "bind address must be loopback",
            Self::ZeroFrameDeadline => "frame_deadline must be positive",
            Self::ZeroDrainGrace => "drain_grace must be positive",
            Self::UnsupportedOption => "unsupported configuration option",
        })
    }
}

impl std::error::Error for ConfigError {}

impl Config {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if !self.bind.ip().is_loopback() {
            return Err(ConfigError::NonLoopbackBind);
        }
        if self.max_connections == 0 {
            return Err(ConfigError::ZeroConnections);
        }
        if self.max_connections > 8 {
            return Err(ConfigError::TooManyConnections);
        }
        if self.queue_capacity == 0 {
            return Err(ConfigError::ZeroQueue);
        }
        if self.max_events == 0 {
            return Err(ConfigError::ZeroEvents);
        }
        if self.frame_deadline.is_zero() {
            return Err(ConfigError::ZeroFrameDeadline);
        }
        if self.drain_grace.is_zero() {
            return Err(ConfigError::ZeroDrainGrace);
        }
        if self.database.as_os_str().is_empty() {
            return Err(ConfigError::UnsupportedOption);
        }
        Ok(())
    }
}
`;

const telemetry = String.raw`#![forbid(unsafe_code)]

pub fn reviewed_fields() -> &'static [&'static str] {
    &["event_kind", "source", "key", "sequence", "outcome"]
}

pub fn emit(event_kind: &str, source: &str, key: &str, sequence: Option<u64>, outcome: &str) {
    eprintln!(
        "event_kind={event_kind} source={source} key={key} sequence={} outcome={outcome}",
        sequence.map_or_else(|| "-".to_owned(), |value| value.to_string())
    );
}
`;

const worker = String.raw`#![forbid(unsafe_code)]

use crate::telemetry;
use ingest_core::{Disposition, Event, Receipt};
use ingest_store::{Store, StoreError};
use std::path::PathBuf;
use std::sync::{Condvar, Mutex};
use tokio::sync::{Notify, mpsc, oneshot};

pub(crate) struct Work {
    pub event: Event,
    pub reply: oneshot::Sender<Result<Receipt, StoreError>>,
}

#[derive(Clone)]
#[doc(hidden)]
pub struct TestHooks {
    pub connection_accepted: std::sync::Arc<Notify>,
    pub frame_started: std::sync::Arc<Notify>,
    pub frame_chunk_consumed: std::sync::Arc<Notify>,
    pub response_written: std::sync::Arc<Notify>,
    pub enqueued: std::sync::Arc<Notify>,
    pub worker_started: std::sync::Arc<Notify>,
    pub draining: std::sync::Arc<Notify>,
    pub connections_aborted: std::sync::Arc<Notify>,
    pub release_worker: std::sync::Arc<ReleaseGate>,
}

#[doc(hidden)]
pub struct ReleaseGate {
    released: Mutex<bool>,
    changed: Condvar,
}

impl ReleaseGate {
    pub fn new() -> Self {
        Self {
            released: Mutex::new(false),
            changed: Condvar::new(),
        }
    }

    pub fn release(&self) {
        if let Ok(mut released) = self.released.lock() {
            *released = true;
            self.changed.notify_one();
        }
    }

    fn wait_bounded(&self, timeout: std::time::Duration) {
        let Ok(released) = self.released.lock() else {
            return;
        };
        let _ = self
            .changed
            .wait_timeout_while(released, timeout, |released| !*released);
    }
}

impl Default for ReleaseGate {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct WorkerStats {
    pub accepted: u64,
    pub inserted: u64,
    pub duplicates: u64,
    pub failed: u64,
}

pub(crate) fn start(
    database: PathBuf,
    max_events: usize,
    mut receiver: mpsc::Receiver<Work>,
    ready: oneshot::Sender<Result<(), StoreError>>,
    hooks: Option<TestHooks>,
) -> tokio::task::JoinHandle<Result<WorkerStats, StoreError>> {
    tokio::task::spawn_blocking(move || {
        let mut store = match Store::open(&database, max_events) {
            Ok(store) => store,
            Err(error) => {
                let _ = ready.send(Err(error));
                return Ok(WorkerStats::default());
            }
        };
        let _ = ready.send(Ok(()));
        let mut stats = WorkerStats::default();
        let mut paused = false;
        while let Some(work) = receiver.blocking_recv() {
            stats.accepted += 1;
            if !paused {
                if let Some(hooks) = &hooks {
                    hooks.worker_started.notify_one();
                    hooks
                        .release_worker
                        .wait_bounded(std::time::Duration::from_secs(1));
                    paused = true;
                }
            }
            telemetry::emit(
                "attempt",
                work.event.source(),
                work.event.key(),
                None,
                "started",
            );
            let source = work.event.source().to_owned();
            let key = work.event.key().to_owned();
            let result = store.ingest(&work.event);
            match &result {
                Ok(receipt) => match receipt.disposition {
                    Disposition::Inserted => {
                        stats.inserted += 1;
                        telemetry::emit(
                            "unique_insert",
                            &source,
                            &key,
                            Some(receipt.sequence),
                            "inserted",
                        );
                    }
                    Disposition::Duplicate => {
                        stats.duplicates += 1;
                        telemetry::emit(
                            "receipt",
                            &source,
                            &key,
                            Some(receipt.sequence),
                            "duplicate",
                        );
                    }
                },
                Err(_) => {
                    stats.failed += 1;
                    telemetry::emit("receipt", &source, &key, None, "failed");
                }
            }
            let _ = work.reply.send(result);
        }
        Ok(stats)
    })
}

pub fn worker_scope() -> &'static str {
    "one owned blocking storage worker"
}
`;

const server = String.raw`#![forbid(unsafe_code)]

use crate::config::{Config, ConfigError};
use crate::worker::{self, TestHooks, Work};
use ingest_core::{Disposition, ProtocolError, decode_frame};
use ingest_store::StoreError;
use std::error::Error;
use std::fmt;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{Semaphore, mpsc, oneshot};
use tokio::task::JoinSet;
use tokio::time::{Instant, timeout_at};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ShutdownReport {
    pub accepted: u64,
    pub inserted: u64,
    pub duplicates: u64,
    pub failed: u64,
    pub pending: u64,
    pub worker_joined: bool,
    pub drain_overdue: bool,
}

#[derive(Debug)]
pub enum ServiceError {
    Config(ConfigError),
    Io(std::io::Error),
    Store(StoreError),
    WorkerStopped,
    Join(tokio::task::JoinError),
}

impl fmt::Display for ServiceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Config(e) => write!(f, "invalid configuration: {e}"),
            Self::Io(e) => write!(f, "I/O error: {e}"),
            Self::Store(e) => write!(f, "storage error: {e}"),
            Self::WorkerStopped => f.write_str("storage worker stopped"),
            Self::Join(e) => write!(f, "task join error: {e}"),
        }
    }
}
impl Error for ServiceError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Config(e) => Some(e),
            Self::Io(e) => Some(e),
            Self::Store(e) => Some(e),
            Self::Join(e) => Some(e),
            Self::WorkerStopped => None,
        }
    }
}
impl From<ConfigError> for ServiceError {
    fn from(e: ConfigError) -> Self {
        Self::Config(e)
    }
}
impl From<std::io::Error> for ServiceError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}
impl From<StoreError> for ServiceError {
    fn from(e: StoreError) -> Self {
        Self::Store(e)
    }
}

const MAX_FRAME_BYTES: usize = 4096;

pub async fn serve(
    listener: TcpListener,
    config: Config,
    shutdown: tokio::sync::oneshot::Receiver<()>,
) -> Result<ShutdownReport, ServiceError> {
    serve_inner(listener, config, shutdown, None).await
}

#[doc(hidden)]
pub async fn serve_with_hooks(
    listener: TcpListener,
    config: Config,
    shutdown: tokio::sync::oneshot::Receiver<()>,
    hooks: TestHooks,
) -> Result<ShutdownReport, ServiceError> {
    serve_inner(listener, config, shutdown, Some(hooks)).await
}

async fn serve_inner(
    listener: TcpListener,
    config: Config,
    mut shutdown: tokio::sync::oneshot::Receiver<()>,
    hooks: Option<TestHooks>,
) -> Result<ShutdownReport, ServiceError> {
    config.validate()?;
    let actual = listener.local_addr()?;
    if !actual.ip().is_loopback() || actual.ip() != config.bind.ip() {
        return Err(ServiceError::Config(ConfigError::NonLoopbackBind));
    }
    let (sender, receiver) = mpsc::channel(config.queue_capacity);
    let (ready_sender, ready_receiver) = oneshot::channel();
    let worker_join = worker::start(
        config.database.clone(),
        config.max_events,
        receiver,
        ready_sender,
        hooks.clone(),
    );
    match ready_receiver.await {
        Ok(Ok(())) => {}
        Ok(Err(error)) => {
            let _ = worker_join.await;
            return Err(ServiceError::Store(error));
        }
        Err(_) => {
            let _ = worker_join.await;
            return Err(ServiceError::WorkerStopped);
        }
    }
    tokio::pin!(worker_join);
    println!("READY {actual}");
    let permits = Arc::new(Semaphore::new(config.max_connections));
    let mut tasks = JoinSet::new();
    let mut active = 0usize;
    let mut terminal_error = None;
    let mut worker_result = None;
    'accept: loop {
        tokio::select! {
            _ = &mut shutdown => break,
            result = &mut worker_join => {
                worker_result = Some(result);
                terminal_error = Some(ServiceError::WorkerStopped);
                break;
            }
            joined = tasks.join_next(), if active > 0 => {
                active -= 1;
                if let Some(Err(error)) = joined {
                    terminal_error = Some(ServiceError::Join(error));
                    break;
                }
            }
            accepted = listener.accept() => {
                while let Some(joined) = tasks.try_join_next() {
                    active = active.saturating_sub(1);
                    if let Err(error) = joined {
                        terminal_error = Some(ServiceError::Join(error));
                        break 'accept;
                    }
                }
                let (stream, peer) = match accepted {
                    Ok(value) => value,
                    Err(error) => {
                        terminal_error = Some(ServiceError::Io(error));
                        break 'accept;
                    }
                };
                let permit = match Arc::clone(&permits).try_acquire_owned() {
                    Ok(permit) => permit,
                    Err(_) => { crate::telemetry::emit("connection_refusal", "-", "-", None, "at_capacity"); drop(stream); continue; }
                };
                let queue = sender.clone();
                let deadline = config.frame_deadline;
                let hooks = hooks.clone();
                tasks.spawn(async move { let _permit = permit; let _ = handle_connection(stream, peer, queue, deadline, hooks).await; });
                active += 1;
            }
        }
    }
    if let Some(hooks) = &hooks {
        hooks.draining.notify_one();
    }
    drop(sender);
    if let Some(error) = terminal_error {
        tasks.abort_all();
        while tasks.join_next().await.is_some() {
            active = active.saturating_sub(1);
        }
        if let Some(result) = worker_result {
            return Err(worker_result_error(result));
        }
        let _ = worker_join.await;
        return Err(error);
    }
    let mut drain_overdue = false;
    let drain_deadline = Instant::now() + config.drain_grace;
    while active > 0 {
        match timeout_at(drain_deadline, tasks.join_next()).await {
            Ok(Some(result)) => {
                active -= 1;
                if let Err(error) = result {
                    terminal_error = Some(ServiceError::Join(error));
                    tasks.abort_all();
                    while tasks.join_next().await.is_some() {
                        active = active.saturating_sub(1);
                    }
                    break;
                }
            }
            Ok(None) => active = 0,
            Err(_) => {
                drain_overdue = true;
                tasks.abort_all();
                while tasks.join_next().await.is_some() {
                    active = active.saturating_sub(1);
                }
                if let Some(hooks) = &hooks {
                    hooks.connections_aborted.notify_one();
                }
            }
        }
    }
    if let Some(error) = terminal_error {
        return match worker_join.await {
            Ok(Ok(_)) => Err(error),
            result => Err(worker_result_error(result)),
        };
    }
    let stats = match worker_join.await {
        Ok(Ok(stats)) => stats,
        Ok(Err(error)) => return Err(ServiceError::Store(error)),
        Err(error) => return Err(ServiceError::Join(error)),
    };
    let report = ShutdownReport {
        accepted: stats.accepted,
        inserted: stats.inserted,
        duplicates: stats.duplicates,
        failed: stats.failed,
        pending: 0,
        worker_joined: true,
        drain_overdue,
    };
    if report.accepted != report.inserted + report.duplicates + report.failed {
        return Err(ServiceError::WorkerStopped);
    }
    Ok(report)
}

fn worker_result_error(
    result: Result<Result<worker::WorkerStats, StoreError>, tokio::task::JoinError>,
) -> ServiceError {
    match result {
        Ok(Ok(_)) => ServiceError::WorkerStopped,
        Ok(Err(error)) => ServiceError::Store(error),
        Err(error) => ServiceError::Join(error),
    }
}

async fn handle_connection(
    stream: TcpStream,
    _peer: std::net::SocketAddr,
    queue: mpsc::Sender<Work>,
    deadline: Duration,
    hooks: Option<TestHooks>,
) -> Result<(), ServiceError> {
    if let Some(hooks) = &hooks {
        hooks.connection_accepted.notify_one();
        let deadline = Instant::now() + deadline;
        hooks.frame_started.notify_one();
        return handle_connection_frame(stream, queue, deadline, Some(hooks.clone())).await;
    }
    handle_connection_frame(stream, queue, Instant::now() + deadline, None).await
}

async fn handle_connection_frame(
    mut stream: TcpStream,
    queue: mpsc::Sender<Work>,
    deadline: Instant,
    hooks: Option<TestHooks>,
) -> Result<(), ServiceError> {
    let frame = match read_frame(
        &mut stream,
        deadline,
        hooks
            .as_ref()
            .map(|hooks| hooks.frame_chunk_consumed.clone()),
    )
    .await
    {
        Ok(frame) => frame,
        Err(error) => {
            write_error(&mut stream, error).await?;
            if let Some(hooks) = &hooks {
                hooks.response_written.notify_one();
            }
            return Ok(());
        }
    };
    let event = match decode_frame(&frame) {
        Ok(event) => event,
        Err(error) => {
            write_error(&mut stream, error).await?;
            return Ok(());
        }
    };
    let source = event.source().to_owned();
    let key = event.key().to_owned();
    let (reply_sender, reply_receiver) = oneshot::channel();
    match queue.try_send(Work {
        event,
        reply: reply_sender,
    }) {
        Ok(()) => {}
        Err(mpsc::error::TrySendError::Full(_)) => {
            crate::telemetry::emit("queue", &source, &key, None, "full");
            write_text(&mut stream, b"ERR\tQUEUE_FULL\n").await?;
            return Ok(());
        }
        Err(mpsc::error::TrySendError::Closed(_)) => return Err(ServiceError::WorkerStopped),
    }
    if let Some(hooks) = &hooks {
        hooks.enqueued.notify_one();
    }
    match reply_receiver.await {
        Ok(Ok(receipt)) => {
            let disposition = match receipt.disposition {
                Disposition::Inserted => "INSERTED",
                Disposition::Duplicate => "DUPLICATE",
            };
            let response = format!("OK\t{}\t{disposition}\n", receipt.sequence);
            write_text(&mut stream, response.as_bytes()).await?;
        }
        Ok(Err(error)) => {
            let reason = match error {
                StoreError::Conflict => "CONFLICT",
                StoreError::Full => "FULL",
                StoreError::Busy => "BUSY",
                StoreError::UnsupportedSchema(_) => "SCHEMA",
                StoreError::Storage(_) => "STORAGE",
            };
            let response = format!("ERR\t{reason}\n");
            write_text(&mut stream, response.as_bytes()).await?;
        }
        Err(_) => return Err(ServiceError::WorkerStopped),
    }
    Ok(())
}

async fn read_frame(
    stream: &mut TcpStream,
    deadline: Instant,
    chunk_consumed: Option<std::sync::Arc<tokio::sync::Notify>>,
) -> Result<Vec<u8>, ProtocolError> {
    let mut frame = Vec::new();
    let mut chunk = [0_u8; 512];
    loop {
        let count = timeout_at(deadline, stream.read(&mut chunk))
            .await
            .map_err(|_| ProtocolError::Fields)
            .and_then(|result| result.map_err(|_| ProtocolError::Fields))?;
        if count == 0 {
            return Err(ProtocolError::Fields);
        }
        frame.extend_from_slice(&chunk[..count]);
        if let Some(chunk_consumed) = &chunk_consumed {
            chunk_consumed.notify_one();
        }
        if let Some(end) = frame.iter().position(|byte| *byte == b'\n') {
            if end > MAX_FRAME_BYTES {
                return Err(ProtocolError::TooLarge);
            }
            return Ok(frame[..=end].to_vec());
        }
        if frame.len() > MAX_FRAME_BYTES + 1 {
            return Err(ProtocolError::TooLarge);
        }
    }
}

async fn write_error(stream: &mut TcpStream, error: ProtocolError) -> Result<(), ServiceError> {
    let reason = match error {
        ProtocolError::TooLarge => "TOO_LARGE",
        ProtocolError::Utf8 => "UTF8",
        ProtocolError::Version => "VERSION",
        ProtocolError::Fields => "FIELDS",
        ProtocolError::Validation(_) => "VALIDATION",
    };
    let response = format!("ERR\t{reason}\n");
    write_text(stream, response.as_bytes()).await
}
async fn write_text(stream: &mut TcpStream, bytes: &[u8]) -> Result<(), ServiceError> {
    stream.write_all(bytes).await?;
    stream.shutdown().await?;
    Ok(())
}
pub fn service_scope() -> &'static str {
    "loopback TCP and controlled shutdown"
}
`;

const main = String.raw`#![forbid(unsafe_code)]

use ingest_service::{Config, serve};
use std::path::PathBuf;
use std::time::Duration;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;
use tokio::sync::oneshot;

fn usage() -> ! {
    eprintln!("usage: ingest-service --db PATH --bind 127.0.0.1:PORT");
    std::process::exit(2);
}
fn arguments() -> (PathBuf, std::net::SocketAddr) {
    let mut args = std::env::args().skip(1);
    let mut database = None;
    let mut bind = None;
    while let Some(flag) = args.next() {
        match flag.as_str() {
            "--db" => database = args.next().map(PathBuf::from),
            "--bind" => bind = args.next().and_then(|v| v.parse().ok()),
            _ => usage(),
        }
    }
    match (database, bind) {
        (Some(database), Some(bind)) => (database, bind),
        _ => usage(),
    }
}
async fn control_eof(sender: oneshot::Sender<()>) {
    let mut stdin = tokio::io::stdin();
    let mut chunk = [0_u8; 4096];
    loop {
        match stdin.read(&mut chunk).await {
            Ok(0) | Err(_) => break,
            Ok(_) => {}
        }
    }
    let _ = sender.send(());
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (database, bind) = arguments();
    let config = Config {
        bind,
        database,
        max_connections: 8,
        queue_capacity: 64,
        max_events: 100_000,
        frame_deadline: Duration::from_secs(5),
        drain_grace: Duration::from_secs(2),
    };
    let listener = match TcpListener::bind(bind).await {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("bind failed: {error}");
            std::process::exit(1);
        }
    };
    let (shutdown_sender, shutdown_receiver) = oneshot::channel();
    let control = control_eof(shutdown_sender);
    tokio::pin!(control);
    let service = serve(listener, config, shutdown_receiver);
    tokio::pin!(service);
    let result =
        tokio::select! { result = &mut service => result, _ = &mut control => service.await };
    if let Err(error) = result {
        let _ = error;
        eprintln!("event_kind=service source=- key=- sequence=- outcome=failed");
        std::process::exit(1);
    }
}
`;

const client = String.raw`#![forbid(unsafe_code)]

use ingest_core::{Event, Level, encode_v1};
use std::time::Duration;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::{Instant, timeout_at};

fn usage() -> ! {
    eprintln!(
        "usage: ingest-client --addr HOST:PORT --source SOURCE --key KEY --level INFO|WARN|ERROR --message MESSAGE"
    );
    std::process::exit(2);
}
fn arguments() -> (String, String, String, Level, String) {
    let mut args = std::env::args().skip(1);
    let mut addr = None;
    let mut source = None;
    let mut key = None;
    let mut level = None;
    let mut message = None;
    while let Some(flag) = args.next() {
        let value = args.next().unwrap_or_else(|| usage());
        match flag.as_str() {
            "--addr" => addr = Some(value),
            "--source" => source = Some(value),
            "--key" => key = Some(value),
            "--level" => {
                level = Some(match value.as_str() {
                    "INFO" => Level::Info,
                    "WARN" => Level::Warn,
                    "ERROR" => Level::Error,
                    _ => usage(),
                })
            }
            "--message" => message = Some(value),
            _ => usage(),
        }
    }
    match (addr, source, key, level, message) {
        (Some(a), Some(s), Some(k), Some(l), Some(m)) => (a, s, k, l, m),
        _ => usage(),
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (addr, source, key, level, message) = arguments();
    let event = match Event::new(source, key, level, message) {
        Ok(event) => event,
        Err(_) => std::process::exit(2),
    };
    let frame = match encode_v1(&event) {
        Ok(frame) => frame,
        Err(_) => std::process::exit(2),
    };
    let deadline = Instant::now() + Duration::from_secs(5);
    let mut stream = match timeout_at(deadline, TcpStream::connect(addr)).await {
        Ok(Ok(stream)) => stream,
        _ => std::process::exit(3),
    };
    if stream.write_all(&frame).await.is_err() {
        std::process::exit(3);
    }
    let response = match read_response(&mut stream, deadline).await {
        Ok(response) => response,
        Err(_) => std::process::exit(3),
    };
    std::process::exit(receipt_exit_code(&response));
}

async fn read_response<R: AsyncRead + Unpin>(
    stream: &mut R,
    deadline: Instant,
) -> Result<Vec<u8>, ()> {
    let mut response = Vec::new();
    let mut chunk = [0_u8; 32];
    loop {
        let count = timeout_at(deadline, stream.read(&mut chunk))
            .await
            .map_err(|_| ())?
            .map_err(|_| ())?;
        if count == 0 {
            return Ok(response);
        }
        if response.len() + count > 128 {
            return Err(());
        }
        response.extend_from_slice(&chunk[..count]);
    }
}

fn receipt_exit_code(response: &[u8]) -> i32 {
    if response.last() != Some(&b'\n') || response[..response.len() - 1].contains(&b'\n') {
        return 3;
    }
    let line = match std::str::from_utf8(&response[..response.len() - 1]) {
        Ok(line) => line,
        Err(_) => return 3,
    };
    let fields: Vec<&str> = line.split('\t').collect();
    if fields.len() == 3
        && fields[0] == "OK"
        && fields[1]
            .parse::<u64>()
            .ok()
            .filter(|value| *value > 0)
            .is_some()
        && matches!(fields[2], "INSERTED" | "DUPLICATE")
    {
        return 0;
    }
    if fields.len() == 2
        && fields[0] == "ERR"
        && matches!(
            fields[1],
            "QUEUE_FULL"
                | "FIELDS"
                | "UTF8"
                | "VERSION"
                | "VALIDATION"
                | "CONFLICT"
                | "FULL"
                | "BUSY"
                | "SCHEMA"
                | "STORAGE"
        )
    {
        return 2;
    }
    3
}

#[cfg(test)]
mod tests {
    use super::{read_response, receipt_exit_code};
    use tokio::io::{AsyncWriteExt, duplex};
    use tokio::time::{Duration, Instant, advance, sleep};

    #[test]
    fn receipt_parser_rejects_extra_newline_and_trailing_bytes() {
        assert_eq!(receipt_exit_code(b"OK\t1\tINSERTED\n\n"), 3);
        assert_eq!(receipt_exit_code(b"OK\t1\tINSERTED\ntrailing"), 3);
        assert_eq!(receipt_exit_code(b"ERR\tUNKNOWN\n"), 3);
    }

    #[tokio::test(start_paused = true)]
    async fn response_deadline_is_absolute_across_slow_reads() {
        let (mut reader, mut writer) = duplex(16);
        let deadline = Instant::now() + Duration::from_secs(5);
        let writer_task = tokio::spawn(async move {
            writer.write_all(b"O").await.unwrap();
            sleep(Duration::from_secs(4)).await;
            writer.write_all(b"K\t1\tINSERTED\n").await.unwrap();
        });
        let response_task = tokio::spawn(async move { read_response(&mut reader, deadline).await });
        advance(Duration::from_secs(4)).await;
        advance(Duration::from_secs(2)).await;
        assert!(response_task.await.unwrap().is_err());
        writer_task.abort();
    }
}
`;

const lifecycleTests = String.raw`use ingest_service::{Config, ConfigError, ReleaseGate, TestHooks, serve_with_hooks};
use std::future::Future;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Notify;
use tokio::time::{advance, timeout};

async fn watchdog<F: Future>(future: F) -> F::Output {
    timeout(Duration::from_secs(3), future)
        .await
        .expect("test watchdog expired")
}

fn config() -> Config {
    Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database: PathBuf::from("events.sqlite"),
        max_connections: 1,
        queue_capacity: 1,
        max_events: 1,
        frame_deadline: Duration::from_secs(1),
        drain_grace: Duration::from_secs(1),
    }
}
fn hooks() -> TestHooks {
    TestHooks {
        connection_accepted: Arc::new(Notify::new()),
        frame_started: Arc::new(Notify::new()),
        frame_chunk_consumed: Arc::new(Notify::new()),
        response_written: Arc::new(Notify::new()),
        enqueued: Arc::new(Notify::new()),
        worker_started: Arc::new(Notify::new()),
        draining: Arc::new(Notify::new()),
        connections_aborted: Arc::new(Notify::new()),
        release_worker: Arc::new(ReleaseGate::new()),
    }
}
#[test]
fn configuration_rejects_zero_limits_and_public_bind() {
    let mut value = config();
    value.max_connections = 0;
    assert_eq!(value.validate(), Err(ConfigError::ZeroConnections));
    value = config();
    value.bind = "0.0.0.0:1".parse().unwrap();
    assert_eq!(value.validate(), Err(ConfigError::NonLoopbackBind));
    value = config();
    value.frame_deadline = Duration::ZERO;
    assert_eq!(value.validate(), Err(ConfigError::ZeroFrameDeadline));
}
#[tokio::test(flavor = "current_thread")]
async fn shutdown_joins_worker_and_reports_terminal_counts() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-lifecycle-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let accepted = test_hooks.connection_accepted.clone();
        let enqueued = test_hooks.enqueued.clone();
        let worker_started = test_hooks.worker_started.clone();
        let release_worker = test_hooks.release_worker.clone();
        let address = listener.local_addr().unwrap();
        let task = tokio::spawn(serve_with_hooks(
            listener,
            Config {
                database: path.clone(),
                ..config()
            },
            rx,
            test_hooks,
        ));
        let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
        stream
            .write_all(b"1\tsource\tkey\tINFO\tmessage\n")
            .await
            .unwrap();
        accepted.notified().await;
        enqueued.notified().await;
        worker_started.notified().await;
        release_worker.release();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        assert_eq!(response, b"OK\t1\tINSERTED\n");
        tx.send(()).unwrap();
        let report = task.await.unwrap().unwrap();
        assert_eq!(report.accepted, 1);
        assert_eq!(report.pending, 0);
        assert!(report.worker_joined);
        assert_eq!(
            report.accepted,
            report.inserted + report.duplicates + report.failed
        );
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn admission_saturation_closes_excess_connection() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-admission-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let accepted = test_hooks.connection_accepted.clone();
        let task = tokio::spawn(serve_with_hooks(
            listener,
            Config {
                database: path.clone(),
                ..config()
            },
            rx,
            test_hooks,
        ));
        let first = tokio::net::TcpStream::connect(address).await.unwrap();
        accepted.notified().await;
        let mut second = tokio::net::TcpStream::connect(address).await.unwrap();
        let mut byte = [0_u8; 1];
        assert_eq!(second.read(&mut byte).await.unwrap(), 0);
        drop(first);
        tx.send(()).unwrap();
        let report = task.await.unwrap().unwrap();
        assert_eq!(report.accepted, 0);
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn absolute_deadline_expires_slow_partial_frame() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-deadline-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let frame_started = test_hooks.frame_started.clone();
        let frame_chunk_consumed = test_hooks.frame_chunk_consumed.clone();
        let response_written = test_hooks.response_written.clone();
        let mut value = config();
        value.database = path.clone();
        value.frame_deadline = Duration::from_millis(50);
        value.drain_grace = Duration::from_millis(10);
        let task = tokio::spawn(serve_with_hooks(listener, value, rx, test_hooks));
        let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
        frame_started.notified().await;
        stream.write_all(b"1\tsource").await.unwrap();
        frame_chunk_consumed.notified().await;
        tokio::time::advance(Duration::from_millis(40)).await;
        stream.write_all(b"\tkey").await.unwrap();
        frame_chunk_consumed.notified().await;
        tokio::time::advance(Duration::from_millis(20)).await;
        let completion = tokio::spawn(async move {
            timeout(Duration::from_millis(1), response_written.notified()).await
        });
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_millis(2)).await;
        tokio::task::yield_now().await;
        let response_written = completion.await.unwrap().is_ok();
        if !response_written {
            tx.send(()).unwrap();
            task.abort();
            let _ = task.await;
            panic!("absolute frame deadline did not expire");
        }
        tx.send(()).unwrap();
        task.await.unwrap().unwrap();
        let mut response = Vec::new();
        let _ = stream.read_to_end(&mut response).await;
        assert!(response.starts_with(b"ERR\tFIELDS"));
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread")]
async fn grace_expiry_aborts_partial_handler_and_joins_worker() {
    watchdog(async {
        let path = std::env::temp_dir().join(format!("ingest-grace-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let accepted = test_hooks.connection_accepted.clone();
        let mut value = config();
        value.database = path.clone();
        value.frame_deadline = Duration::from_secs(100);
        value.drain_grace = Duration::from_millis(20);
        let task = tokio::spawn(serve_with_hooks(listener, value, rx, test_hooks));
        let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
        accepted.notified().await;
        stream.write_all(b"1\tsource").await.unwrap();
        tx.send(()).unwrap();
        let report = timeout(Duration::from_secs(2), task)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        assert!(report.worker_joined);
        assert!(report.drain_overdue);
        drop(stream);
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn paused_clock_marks_grace_expiry_without_wall_clock_waiting() {
    let path = std::env::temp_dir().join(format!("ingest-paused-{}.sqlite", std::process::id()));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (tx, rx) = tokio::sync::oneshot::channel();
    let test_hooks = hooks();
    let accepted = test_hooks.connection_accepted.clone();
    let draining = test_hooks.draining.clone();
    let mut value = config();
    value.database = path.clone();
    value.frame_deadline = Duration::from_secs(100);
    value.drain_grace = Duration::from_secs(1);
    let task = tokio::spawn(serve_with_hooks(listener, value, rx, test_hooks));
    let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
    accepted.notified().await;
    stream.write_all(b"1\tsource").await.unwrap();
    tx.send(()).unwrap();
    draining.notified().await;
    advance(Duration::from_secs(2)).await;
    let report = timeout(Duration::from_secs(1), task)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert!(report.drain_overdue);
    drop(stream);
    let _ = std::fs::remove_file(path);
}

#[tokio::test(flavor = "current_thread")]
async fn cancellation_after_enqueue_keeps_terminal_accounting() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-cancel-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let enqueued = test_hooks.enqueued.clone();
        let worker_started = test_hooks.worker_started.clone();
        let release_worker = test_hooks.release_worker.clone();
        let connections_aborted = test_hooks.connections_aborted.clone();
        let task = tokio::spawn(serve_with_hooks(
            listener,
            Config {
                database: path.clone(),
                drain_grace: Duration::from_millis(20),
                ..config()
            },
            rx,
            test_hooks,
        ));
        let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
        stream
            .write_all(b"1\tsource\tdisconnect-key\tINFO\tmessage\n")
            .await
            .unwrap();
        enqueued.notified().await;
        worker_started.notified().await;
        tx.send(()).unwrap();
        drop(stream);
        connections_aborted.notified().await;
        release_worker.release();
        let report = task.await.unwrap().unwrap();
        assert!(report.accepted > 0);
        assert_eq!(report.accepted, 1);
        assert_eq!(report.inserted, 1);
        assert_eq!(
            report.accepted,
            report.inserted + report.duplicates + report.failed
        );
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread")]
async fn queue_saturation_returns_bounded_rejection() {
    watchdog(async {
        let path = std::env::temp_dir().join(format!("ingest-queue-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let test_hooks = hooks();
        let enqueued = test_hooks.enqueued.clone();
        let worker_started = test_hooks.worker_started.clone();
        let release_worker = test_hooks.release_worker.clone();
        let mut value = config();
        value.database = path.clone();
        value.max_connections = 4;
        value.queue_capacity = 1;
        value.max_events = 4;
        let task = tokio::spawn(serve_with_hooks(listener, value, rx, test_hooks));
        let frame = b"1\tsource\tqueue\tINFO\tmessage\n";
        let first_address = address;
        let first = tokio::spawn(async move {
            let mut stream = tokio::net::TcpStream::connect(first_address).await.unwrap();
            stream.write_all(frame).await.unwrap();
            let mut response = Vec::new();
            stream.read_to_end(&mut response).await.unwrap();
            response
        });
        enqueued.notified().await;
        worker_started.notified().await;
        let second_address = address;
        let second = tokio::spawn(async move {
            let mut stream = tokio::net::TcpStream::connect(second_address)
                .await
                .unwrap();
            stream
                .write_all(b"1\tsource\tqueue-two\tINFO\tmessage\n")
                .await
                .unwrap();
            let mut response = Vec::new();
            stream.read_to_end(&mut response).await.unwrap();
            response
        });
        enqueued.notified().await;
        let mut third = tokio::net::TcpStream::connect(address).await.unwrap();
        third.write_all(frame).await.unwrap();
        let mut third_response = Vec::new();
        third.read_to_end(&mut third_response).await.unwrap();
        assert_eq!(third_response, b"ERR\tQUEUE_FULL\n");
        release_worker.release();
        assert_eq!(first.await.unwrap(), b"OK\t1\tINSERTED\n");
        assert_eq!(second.await.unwrap(), b"OK\t2\tINSERTED\n");
        tx.send(()).unwrap();
        let report = task.await.unwrap().unwrap();
        assert_eq!(
            report.accepted,
            report.inserted + report.duplicates + report.failed
        );
        let _ = std::fs::remove_file(path);
    })
    .await;
}
`;

const loopbackTests = String.raw`use ingest_core::{Event, Level, encode_v1, encode_v2};
use ingest_service::Config;
use std::future::Future;
use std::path::PathBuf;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::timeout;

async fn watchdog<F: Future>(future: F) -> F::Output {
    timeout(Duration::from_secs(3), future)
        .await
        .expect("test watchdog expired")
}
fn config(path: PathBuf) -> Config {
    Config {
        bind: "127.0.0.1:0".parse().unwrap(),
        database: path,
        max_connections: 2,
        queue_capacity: 2,
        max_events: 4,
        frame_deadline: Duration::from_secs(1),
        drain_grace: Duration::from_secs(1),
    }
}
#[tokio::test(flavor = "current_thread")]
async fn split_frame_and_duplicate_return_receipts() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-loopback-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let mut value = config(path.clone());
        value.max_connections = 4;
        value.queue_capacity = 4;
        let task = tokio::spawn(ingest_service::serve(listener, value, rx));
        let event =
            Event::new("source".into(), "key".into(), Level::Info, "message".into()).unwrap();
        let frame = encode_v1(&event).unwrap();
        for _ in 0..2 {
            let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
            for chunk in frame.chunks(2) {
                stream.write_all(chunk).await.unwrap();
            }
            stream.shutdown().await.unwrap();
            let mut response = Vec::new();
            stream.read_to_end(&mut response).await.unwrap();
            assert!(response.starts_with(b"OK\t"));
        }
        tx.send(()).unwrap();
        let report = task.await.unwrap().unwrap();
        assert_eq!(report.inserted, 1);
        assert_eq!(report.duplicates, 1);
        let _ = std::fs::remove_file(path);
    })
    .await;
}
#[tokio::test(flavor = "current_thread")]
async fn oversized_and_unknown_frames_are_rejected() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-errors-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let task = tokio::spawn(ingest_service::serve(listener, config(path.clone()), rx));
        for frame in [
            b"9\tsource\tkey\tINFO\tmessage\n".as_slice(),
            vec![b'a'; 4098].as_slice(),
        ] {
            let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
            stream.write_all(frame).await.unwrap();
            let mut response = Vec::new();
            stream.read_to_end(&mut response).await.unwrap();
            assert!(response.starts_with(b"ERR\t"));
        }
        tx.send(()).unwrap();
        task.await.unwrap().unwrap();
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread")]
async fn multibyte_split_slow_partial_and_conflict_frames_are_checked() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-unicode-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let task = tokio::spawn(ingest_service::serve(listener, config(path.clone()), rx));
        let event =
            Event::new("source".into(), "unicode".into(), Level::Info, "ą🙂".into()).unwrap();
        let frame = encode_v2(&event);
        let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
        for byte in frame {
            stream.write_all(&[byte]).await.unwrap();
        }
        stream.shutdown().await.unwrap();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        assert!(response.starts_with(b"OK\t"));

        let mut slow = tokio::net::TcpStream::connect(address).await.unwrap();
        slow.write_all(b"1\tsource\tslow\tINFO\t").await.unwrap();
        let mut slow_response = Vec::new();
        tokio::time::timeout(Duration::from_secs(2), slow.read_to_end(&mut slow_response))
            .await
            .unwrap()
            .unwrap();
        assert!(slow_response.starts_with(b"ERR\tFIELDS"));

        let changed = Event::new(
            "source".into(),
            "unicode".into(),
            Level::Info,
            "different".into(),
        )
        .unwrap();
        let mut conflict = tokio::net::TcpStream::connect(address).await.unwrap();
        conflict
            .write_all(&encode_v1(&changed).unwrap())
            .await
            .unwrap();
        let mut conflict_response = Vec::new();
        conflict.read_to_end(&mut conflict_response).await.unwrap();
        assert!(conflict_response.starts_with(b"ERR\tCONFLICT"));
        tx.send(()).unwrap();
        task.await.unwrap().unwrap();
        let _ = std::fs::remove_file(path);
    })
    .await;
}

#[tokio::test(flavor = "current_thread")]
async fn concurrent_duplicate_clients_share_one_sequence() {
    watchdog(async {
        let path =
            std::env::temp_dir().join(format!("ingest-concurrent-{}.sqlite", std::process::id()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel();
        let mut value = config(path.clone());
        value.max_connections = 4;
        value.queue_capacity = 4;
        let task = tokio::spawn(ingest_service::serve(listener, value, rx));
        let frame = encode_v1(
            &Event::new(
                "source".into(),
                "concurrent".into(),
                Level::Info,
                "message".into(),
            )
            .unwrap(),
        )
        .unwrap();
        let mut clients = Vec::new();
        for _ in 0..3 {
            let frame = frame.clone();
            clients.push(tokio::spawn(async move {
                let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
                stream.write_all(&frame).await.unwrap();
                let mut response = Vec::new();
                stream.read_to_end(&mut response).await.unwrap();
                response
            }));
        }
        let responses: Vec<Vec<u8>> = futures_join_all(clients).await;
        assert_eq!(
            responses
                .iter()
                .filter(|value| value.starts_with(b"OK\t"))
                .count(),
            3
        );
        let sequences: Vec<u64> = responses
            .iter()
            .map(|value| {
                let line = std::str::from_utf8(value).unwrap();
                let fields: Vec<&str> = line.strip_suffix('\n').unwrap().split('\t').collect();
                fields[1].parse().unwrap()
            })
            .collect();
        assert!(sequences.iter().all(|sequence| *sequence == sequences[0]));
        tx.send(()).unwrap();
        let report = task.await.unwrap().unwrap();
        assert_eq!(report.inserted, 1);
        assert_eq!(report.duplicates, 2);
        let _ = std::fs::remove_file(path);
    })
    .await;
}

async fn futures_join_all<T>(tasks: Vec<tokio::task::JoinHandle<T>>) -> Vec<T> {
    let mut values = Vec::new();
    for task in tasks {
        values.push(task.await.unwrap());
    }
    values
}
`;

const restartTests = String.raw`use ingest_core::{Disposition, Event, Level};
use ingest_store::Store;
#[test]
fn reopening_database_replays_same_request_as_duplicate() {
    let path = std::env::temp_dir().join(format!("ingest-restart-{}.sqlite", std::process::id()));
    let event = Event::new("source".into(), "key".into(), Level::Info, "message".into()).unwrap();
    let first = Store::open(&path, 4).unwrap().ingest(&event).unwrap();
    let second = Store::open(&path, 4).unwrap().ingest(&event).unwrap();
    assert_eq!(first.disposition, Disposition::Inserted);
    assert_eq!(second.disposition, Disposition::Duplicate);
    assert_eq!(first.sequence, second.sequence);
    let _ = std::fs::remove_file(path);
}
`;

const processTests = String.raw`use ingest_core::{Event, Level, encode_v1};
use ingest_store::Store;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

fn kill_reap(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn wait_with_watchdog(child: &mut Child) -> std::process::ExitStatus {
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        match child.try_wait().unwrap() {
            Some(status) => return status,
            None if Instant::now() >= deadline => {
                kill_reap(child);
                panic!("child watchdog expired");
            }
            None => thread::yield_now(),
        }
    }
}

fn run_client(args: &[String]) -> std::process::ExitStatus {
    let mut child = Command::new(env!("CARGO_BIN_EXE_ingest-client"))
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    wait_with_watchdog(&mut child)
}

fn start(path: &std::path::Path) -> (Child, SocketAddr) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_ingest-service"))
        .args(["--db", path.to_str().unwrap(), "--bind", "127.0.0.1:0"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let stdout = child.stdout.take().unwrap();
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let mut line = String::new();
        let _ = BufReader::new(stdout).read_line(&mut line);
        let _ = sender.send(line);
    });
    let ready = match receiver.recv_timeout(Duration::from_secs(3)) {
        Ok(line) => line,
        Err(_) => {
            kill_reap(&mut child);
            panic!("READY watchdog expired");
        }
    };
    assert!(ready.starts_with("READY 127.0.0.1:"));
    let address = ready
        .trim()
        .strip_prefix("READY ")
        .unwrap()
        .parse()
        .unwrap();
    (child, address)
}

fn stop(child: &mut Child) -> std::process::ExitStatus {
    drop(child.stdin.take());
    wait_with_watchdog(child)
}

fn request(address: SocketAddr, frame: &[u8]) -> Vec<u8> {
    let mut stream = TcpStream::connect(address).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(3)))
        .unwrap();
    stream.write_all(frame).unwrap();
    stream.shutdown(std::net::Shutdown::Write).unwrap();
    let mut response = Vec::new();
    stream.read_to_end(&mut response).unwrap();
    response
}

fn frame(key: &str, message: &str) -> Vec<u8> {
    encode_v1(&Event::new("source".into(), key.into(), Level::Info, message.into()).unwrap())
        .unwrap()
}

fn wait_for_count(path: &std::path::Path, expected: u64, child: &mut Child) {
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        if let Ok(store) = Store::open(path, 4) {
            if store.count().unwrap_or(0) >= expected {
                return;
            }
        }
        if Instant::now() >= deadline {
            kill_reap(child);
            panic!("storage commit watchdog expired");
        }
        thread::yield_now();
    }
}

#[test]
fn valid_process_prints_ready_after_initialization_and_eof_stops_it() {
    let path = std::env::temp_dir().join(format!("ingest-process-{}.sqlite", std::process::id()));
    let (mut child, _) = start(&path);
    assert!(stop(&mut child).success());
    let _ = std::fs::remove_file(path);
}

#[test]
fn invalid_flags_return_code_two() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_ingest-service"))
        .arg("--unknown")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .spawn()
        .unwrap();
    assert_eq!(wait_with_watchdog(&mut child).code(), Some(2));
}

#[test]
fn acknowledged_receipt_survives_crash_and_restart() {
    let path =
        std::env::temp_dir().join(format!("ingest-ack-restart-{}.sqlite", std::process::id()));
    let payload = frame("ack", "message");
    let (mut first, address) = start(&path);
    let first_response = request(address, &payload);
    assert!(first_response.starts_with(b"OK\t1\tINSERTED\n"));
    kill_reap(&mut first);
    let (mut second, address) = start(&path);
    let replay = request(address, &payload);
    assert!(replay.starts_with(b"OK\t1\tDUPLICATE\n"));
    assert!(stop(&mut second).success());
    assert_eq!(Store::open(&path, 4).unwrap().count().unwrap(), 1);
    let _ = std::fs::remove_file(path);
}

#[test]
fn unacknowledged_crash_replay_leaves_exactly_one_row() {
    let path = std::env::temp_dir().join(format!(
        "ingest-unack-restart-{}.sqlite",
        std::process::id()
    ));
    let payload = frame("unack", "message");
    let (mut first, address) = start(&path);
    let mut socket = TcpStream::connect(address).unwrap();
    socket.write_all(&payload).unwrap();
    wait_for_count(&path, 1, &mut first);
    kill_reap(&mut first);
    let (mut second, address) = start(&path);
    let replay = request(address, &payload);
    assert_eq!(replay, b"OK\t1\tDUPLICATE\n");
    assert!(stop(&mut second).success());
    assert_eq!(Store::open(&path, 4).unwrap().count().unwrap(), 1);
    let _ = std::fs::remove_file(path);
}

#[test]
fn client_exit_codes_distinguish_receipt_domain_and_transport() {
    let path = std::env::temp_dir().join(format!(
        "ingest-client-process-{}.sqlite",
        std::process::id()
    ));
    let (mut child, address) = start(&path);
    let address = address.to_string();
    let valid = run_client(&[
        "--addr".into(),
        address.clone(),
        "--source".into(),
        "source".into(),
        "--key".into(),
        "client".into(),
        "--level".into(),
        "INFO".into(),
        "--message".into(),
        "message".into(),
    ]);
    assert_eq!(valid.code(), Some(0));
    let domain = run_client(&[
        "--addr".into(),
        address.clone(),
        "--source".into(),
        "source".into(),
        "--key".into(),
        "client".into(),
        "--level".into(),
        "INFO".into(),
        "--message".into(),
        "bad\nmessage".into(),
    ]);
    assert_eq!(domain.code(), Some(2));
    assert!(stop(&mut child).success());
    let unused = std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap();
    let transport = run_client(&[
        "--addr".into(),
        unused.to_string(),
        "--source".into(),
        "source".into(),
        "--key".into(),
        "client".into(),
        "--level".into(),
        "INFO".into(),
        "--message".into(),
        "message".into(),
    ]);
    assert_eq!(transport.code(), Some(3));
    let _ = std::fs::remove_file(path);
}
`;

const workload = String.raw`use ingest_core::{Disposition, Event, Level};
use ingest_store::Store;
use std::time::Instant;

fn main() {
    let path = std::env::temp_dir().join(format!(
        "ingest-fixed-workload-{}-{}.sqlite",
        std::process::id(),
        512
    ));
    let started = Instant::now();
    let mut store = Store::open(&path, 512).expect("open workload store");
    let mut inserted = 0_u64;
    let mut duplicates = 0_u64;
    let mut original_sequences = [0_u64; 256];
    for index in 0..512_u32 {
        let key = format!("key-{}", index / 2);
        let event = Event::new(
            "fixed".to_owned(),
            key,
            Level::Info,
            format!("message-{}", index / 2),
        )
        .expect("bounded workload event");
        match store.ingest(&event).expect("workload receipt") {
            ingest_core::Receipt {
                sequence,
                disposition: Disposition::Inserted,
            } => {
                original_sequences[(index / 2) as usize] = sequence;
                inserted += 1;
            }
            ingest_core::Receipt {
                sequence,
                disposition: Disposition::Duplicate,
            } => {
                assert_eq!(sequence, original_sequences[(index / 2) as usize]);
                duplicates += 1;
            }
        }
    }
    let count = store.count().expect("workload count");
    assert_eq!(inserted, 256);
    assert_eq!(duplicates, 256);
    assert_eq!(inserted + duplicates, 512);
    assert_eq!(count, inserted);
    println!(
        "events=512 inserted={inserted} duplicates={duplicates} unique={inserted} count={count} elapsed_ms={}",
        started.elapsed().as_millis()
    );
    drop(store);
    let _ = std::fs::remove_file(path);
}
`;

const serviceLibStarter = String.raw`#![forbid(unsafe_code)]

pub mod config;
pub mod server;
pub mod telemetry;
pub mod worker;
`;
const configStarter = String.raw`#![forbid(unsafe_code)]

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub max_connections: usize,
    pub queue_capacity: usize,
    pub max_events: usize,
}
`;
const workerStarter = String.raw`#![forbid(unsafe_code)]

pub fn worker_scope() -> &'static str {
    "jeden właściciel trwałego zapisu"
}
`;
const serverStarter = String.raw`#![forbid(unsafe_code)]

pub fn service_scope() -> &'static str {
    "loopback TCP i kontrolowane wygaszanie"
}
`;
const telemetryStarter = String.raw`#![forbid(unsafe_code)]

pub fn reviewed_fields() -> &'static [&'static str] {
    &["event_kind", "source", "key", "sequence", "outcome"]
}
`;
const mainStarter = String.raw`#![forbid(unsafe_code)]

fn main() {
    eprintln!("Starter serwisu zostanie uzupełniony w kolejnym zadaniu.");
}
`;
const clientStarter = String.raw`#![forbid(unsafe_code)]

fn main() {
    eprintln!("Starter klienta zostanie uzupełniony w kolejnym zadaniu.");
}
`;
const ignoredLifecycle = String.raw`#[test]
#[ignore = "Kontrakt cyklu życia zostanie zaimplementowany w zadaniu 3."]
fn lifecycle_contract_is_implemented_in_task_three() {}
`;
const ignoredLoopback = String.raw`#[test]
#[ignore = "Kontrakt loopback zostanie zaimplementowany w zadaniu 3."]
fn loopback_contract_is_implemented_in_task_three() {}
`;
const ignoredRestart = String.raw`#[test]
#[ignore = "Kontrakt restartu zostanie zaimplementowany w zadaniu 3."]
fn restart_contract_is_implemented_in_task_three() {}
`;
const ignoredProcess = String.raw`#[test]
#[ignore = "Kontrakt procesu zostanie zaimplementowany w zadaniu 3."]
fn process_contract_is_implemented_in_task_three() {}
`;
const workloadStarter = String.raw`fn main() {
    println!("Stały mały workload będzie dodany razem z dowodem wydania.");
}
`;

export const ingestServiceFiles: ProjectPackage["files"] = [
  {
    path: "crates/ingest-service/Cargo.toml",
    starter: serviceManifest,
    solution: serviceManifest,
  },
  {
    path: "crates/ingest-service/src/lib.rs",
    starter: serviceLibStarter,
    solution: serviceLib,
  },
  {
    path: "crates/ingest-service/src/config.rs",
    starter: configStarter,
    solution: config,
  },
  {
    path: "crates/ingest-service/src/worker.rs",
    starter: workerStarter,
    solution: worker,
  },
  {
    path: "crates/ingest-service/src/server.rs",
    starter: serverStarter,
    solution: server,
  },
  {
    path: "crates/ingest-service/src/telemetry.rs",
    starter: telemetryStarter,
    solution: telemetry,
  },
  {
    path: "crates/ingest-service/src/main.rs",
    starter: mainStarter,
    solution: main,
  },
  {
    path: "crates/ingest-service/src/bin/ingest-client.rs",
    starter: clientStarter,
    solution: client,
  },
  {
    path: "crates/ingest-service/tests/lifecycle.rs",
    starter: ignoredLifecycle,
    solution: lifecycleTests,
  },
  {
    path: "crates/ingest-service/tests/loopback.rs",
    starter: ignoredLoopback,
    solution: loopbackTests,
  },
  {
    path: "crates/ingest-service/tests/restart.rs",
    starter: ignoredRestart,
    solution: restartTests,
  },
  {
    path: "crates/ingest-service/tests/process.rs",
    starter: ignoredProcess,
    solution: processTests,
  },
  {
    path: "crates/ingest-service/examples/fixed_workload.rs",
    starter: workloadStarter,
    solution: workload,
  },
];
