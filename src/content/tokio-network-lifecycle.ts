import { ownedFrameDiscardTransfer } from "./tokio-network-recovery";
import { choose, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

export const tokioNetworkLifecycleSources: Source[] = [
  {
    id: "tokio-timeout-at",
    title: "Tokio 1.54.1: time::timeout_at",
    url: "https://docs.rs/tokio/1.54.1/tokio/time/fn.timeout_at.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki deadline, anulowania Future albo zachowania po upływie Instant.",
  },
  {
    id: "tokio-time-instant",
    title: "Tokio 1.54.1: time::Instant",
    url: "https://docs.rs/tokio/1.54.1/tokio/time/struct.Instant.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie testów zatrzymanego czasu, obliczania deadline albo konwersji czasu Tokio.",
  },
  {
    id: "tokio-network-lifecycle-tcp-listener",
    title: "Tokio 1.54.1: net::TcpListener",
    url: "https://docs.rs/tokio/1.54.1/tokio/net/struct.TcpListener.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie accept, cancellation safety, bind loopback lub sposobu zatrzymania listenera.",
  },
  {
    id: "tokio-network-lifecycle-tcp-stream",
    title: "Tokio 1.54.1: net::TcpStream",
    url: "https://docs.rs/tokio/1.54.1/tokio/net/struct.TcpStream.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie własności streamu, AsyncRead/AsyncWrite, half-close albo zachowania po Drop.",
  },
  {
    id: "tokio-semaphore",
    title: "Tokio 1.54.1: sync::Semaphore",
    url: "https://docs.rs/tokio/1.54.1/tokio/sync/struct.Semaphore.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie kolejki acquire_owned, close, fairness lub liczby dostępnych permitów.",
  },
  {
    id: "tokio-owned-semaphore-permit",
    title: "Tokio 1.54.1: sync::OwnedSemaphorePermit",
    url: "https://docs.rs/tokio/1.54.1/tokio/sync/struct.OwnedSemaphorePermit.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie własności permitu, Drop albo przekazywania go do taska po accept.",
  },
  {
    id: "tokio-watch-receiver",
    title: "Tokio 1.54.1: sync::watch::Receiver",
    url: "https://docs.rs/tokio/1.54.1/tokio/sync/watch/struct.Receiver.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie borrow_and_update, changed lub polityki dla Drop wszystkich Senderów stopu.",
  },
  {
    id: "tokio-join-handle-network",
    title: "Tokio 1.54.1: task::JoinHandle",
    url: "https://docs.rs/tokio/1.54.1/tokio/task/struct.JoinHandle.html",
    classification: "versioned",
    reviewedAt: "2026-10-24",
    recheckPolicy:
      "Sprawdzaj przy zmianie raportowania JoinError, Drop uchwytu albo shutdown, który rozlicza dzieci.",
  },
];

export const tokioNetworkLifecycleCompetencies: Competency[] = [
  {
    id: "frame-under-one-tokio-deadline",
    title:
      "Przenosisz ograniczoną ramkę przez jeden absolutny deadline i rozróżniasz Elapsed od własnego io::Error.",
  },
  {
    id: "admit-tcp-work-through-completion",
    title:
      "Rezerwujesz permit przed accept i zachowujesz go w obsłużonym połączeniu aż do rzeczywistego końca taska.",
  },
];

export const tokioNetworkLifecycleConcepts: Concept[] = [
  {
    id: "tokio-frame-absolute-deadline",
    title: "Jedna absolutna granica czasu ramki",
    prerequisites: ["tokio-tcp-directional-shutdown"],
    competencyIds: ["frame-under-one-tokio-deadline"],
    reviewPrompt:
      "Dlaczego deadline ramki powinien być pojedynczym Instant dla headera, body i flush, czym różni się Elapsed od io::Error oraz dlaczego po timeout nie obiecujesz retry na tym samym TcpStream?",
    reviewAnswer:
      "Wywołujący wybiera jeden `Instant` przed pierwszym I/O i przekazuje go do `timeout_at` obejmującego całą operację. Odnawianie `Duration` po każdej porcji pozwala wolnemu peerowi utrzymywać ramkę bez końca. `Elapsed` mówi, że skończył się budżet oczekiwania; `io::Error` jest wynikiem transportu i musi pozostać osobnym, własnym błędem. `read_exact` lub `write_all` mogły już wykonać część ramki, zanim Future zostało anulowane, dlatego bez caller-owned stanu wznawiania po timeout upuszczasz całe połączenie zamiast zaczynać tę ramkę ponownie.",
    distinguish:
      "Deadline nie potwierdza przetworzenia przez zdalną aplikację, a flush nie cofa ani nie atomizuje bajtów. Poprzednia lekcja o half-close mówi, który kierunek streamu kończy `shutdown`; tutaj decyzja po niedokończonej ramce jest ostrzejsza: zamykamy własność całego TcpStream, aby nie pomylić pozostałych bajtów z nowym żądaniem.",
  },
  {
    id: "tokio-admission-permit-lifetime",
    title: "Admission przed accept i życie permitu",
    prerequisites: ["tokio-tcp-directional-shutdown"],
    competencyIds: ["admit-tcp-work-through-completion"],
    reviewPrompt:
      "Dlaczego permit zdobywasz przed rozpoczęciem accept, jak stop wygrywa z oczekiwaniem oraz gdzie kończy się własność permitu po udanym accept?",
    reviewAnswer:
      "Semaphore ogranicza aktywną pracę aplikacji, więc najpierw czekamy na owned permit, a dopiero potem tworzymy Future `accept`. Widoczny wcześniej stop ma pierwszeństwo; podczas oczekiwania na permit lub accept sygnał true albo Drop ostatniego Sendera stopu kończy admission. Po sukcesie `(TcpStream, OwnedSemaphorePermit)` przechodzą razem do taska handlera. Permit jest tam lokalną własnością aż handler zwróci sukces albo błąd, a każdy błąd accept zwalnia go przez Drop zanim wynik opuści helper.",
    distinguish:
      "Kernelowy backlog może utrzymywać oczekujące połączenia jeszcze zanim aplikacja je zaakceptuje. To nie jest licznik aktywnych handlerów. Semaphore opisuje tylko admission aplikacji: nie wolno wpuszczać nieograniczonej liczby tasków czekających na permit, a Drop listenera zatrzymuje kolejne accept przed join wszystkich już wpuszczonych dzieci.",
  },
];

const deadlineRun = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};
use tokio::time::{timeout_at, Duration, Instant};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let (mut writer, mut reader) = io::duplex(16);
            writer.write_all(&[0, 2, b'o', b'k']).await.unwrap();
            let deadline = Instant::now() + Duration::from_secs(1);
            let body = timeout_at(deadline, async {
                let mut header = [0; 2];
                reader.read_exact(&mut header).await?;
                let mut body = vec![0; u16::from_be_bytes(header) as usize];
                reader.read_exact(&mut body).await?;
                Ok::<_, std::io::Error>(body)
            })
            .await
            .unwrap()
            .unwrap();
            println!("body={}", String::from_utf8(body).unwrap());
        });
}`;

const frameDeadlineGateStarter = `use tokio::io::{self, AsyncRead, AsyncReadExt};
use tokio::time::Instant;

#[derive(Debug)]
pub enum FrameReadError {
    Timeout,
    Io(io::Error),
}

pub async fn read_frame_before<R>(
    _reader: &mut R,
    _limit: usize,
    _deadline: Instant,
) -> Result<Option<Vec<u8>>, FrameReadError>
where
    R: AsyncRead + Unpin,
{
    todo!("obejmij całą ramkę jednym timeout_at")
}`;

const frameDeadlineGateSolution = `use tokio::io::{self, AsyncRead, AsyncReadExt, ErrorKind};
use tokio::time::{timeout_at, Instant};

#[derive(Debug)]
pub enum FrameReadError {
    Timeout,
    Io(io::Error),
}

pub async fn read_frame_before<R>(
    reader: &mut R,
    limit: usize,
    deadline: Instant,
) -> Result<Option<Vec<u8>>, FrameReadError>
where
    R: AsyncRead + Unpin,
{
    let read_one = async {
        let mut header = [0; 2];
        let mut header_filled = 0;
        while header_filled < header.len() {
            let read = reader.read(&mut header[header_filled..]).await?;
            if read == 0 {
                return if header_filled == 0 {
                    Ok(None)
                } else {
                    Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame header"))
                };
            }
            header_filled += read;
        }

        let length = u16::from_be_bytes(header) as usize;
        if length > limit {
            return Err(io::Error::new(ErrorKind::InvalidData, "frame exceeds limit"));
        }

        let mut body = vec![0; length];
        let mut body_filled = 0;
        while body_filled < body.len() {
            let read = reader.read(&mut body[body_filled..]).await?;
            if read == 0 {
                return Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame body"));
            }
            body_filled += read;
        }
        Ok(Some(body))
    };

    match timeout_at(deadline, read_one).await {
        Ok(Ok(frame)) => Ok(frame),
        Ok(Err(error)) => Err(FrameReadError::Io(error)),
        Err(_) => Err(FrameReadError::Timeout),
    }
}`;

const frameDeadlineGateTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::time::Duration;
use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWriteExt, ReadBuf};
use tokio::time::{advance, sleep, Instant, Sleep};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

struct ScheduledReader {
    chunks: Vec<Vec<u8>>,
    next: usize,
    delay: Duration,
    wait: Option<Pin<Box<Sleep>>>,
}
impl ScheduledReader {
    fn new(chunks: Vec<Vec<u8>>, delay: Duration) -> Self {
        Self { chunks, next: 0, delay, wait: None }
    }
}
impl AsyncRead for ScheduledReader {
    fn poll_read(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        buffer: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        let this = self.get_mut();
        if this.next == this.chunks.len() {
            return Poll::Ready(Ok(()));
        }
        if this.wait.is_none() {
            this.wait = Some(Box::pin(sleep(this.delay)));
        }
        if this.wait.as_mut().expect("timer exists").as_mut().poll(context).is_pending() {
            return Poll::Pending;
        }
        this.wait = None;
        buffer.put_slice(&this.chunks[this.next]);
        this.next += 1;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn one_absolute_deadline_expires_after_several_individually_short_chunks() {
    let start = Instant::now();
    let deadline = start + Duration::from_secs(10);
    let mut reader = ScheduledReader::new(
        vec![vec![0], vec![3], vec![b'c'], vec![b'a'], vec![b't']],
        Duration::from_secs(4),
    );
    let mut reading = Box::pin(read_frame_before(&mut reader, 8, deadline));

    assert!(poll_once(reading.as_mut()).is_pending());
    advance(Duration::from_secs(4)).await;
    assert!(poll_once(reading.as_mut()).is_pending());
    advance(Duration::from_secs(4)).await;
    assert!(poll_once(reading.as_mut()).is_pending());
    advance(Duration::from_secs(2)).await;

    assert!(matches!(reading.await, Err(FrameReadError::Timeout)));
    assert_eq!(Instant::now(), deadline);
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn reads_a_complete_frame_before_deadline() {
    let (mut writer, mut reader) = io::duplex(32);
    writer.write_all(&[0, 2, b'o', b'k']).await.unwrap();
    assert_eq!(
        read_frame_before(&mut reader, 2, Instant::now() + Duration::from_secs(1))
            .await
            .unwrap(),
        Some(b"ok".to_vec()),
    );

    let (mut empty_writer, mut empty_reader) = io::duplex(32);
    empty_writer.write_all(&[0, 0]).await.unwrap();
    assert_eq!(
        read_frame_before(
            &mut empty_reader,
            0,
            Instant::now() + Duration::from_secs(1),
        )
        .await
        .unwrap(),
        Some(Vec::new()),
    );
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn distinguishes_clean_eof_truncation_bounds_and_the_original_io_error() {
    let (mut eof_writer, mut eof_reader) = io::duplex(32);
    eof_writer.shutdown().await.unwrap();
    assert_eq!(
        read_frame_before(&mut eof_reader, 8, Instant::now() + Duration::from_secs(1))
            .await
            .unwrap(),
        None,
    );

    let (mut truncated_writer, mut truncated_reader) = io::duplex(32);
    truncated_writer.write_all(&[0]).await.unwrap();
    truncated_writer.shutdown().await.unwrap();
    let truncated = read_frame_before(
        &mut truncated_reader,
        8,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(truncated, Err(FrameReadError::Io(error)) if error.kind() == io::ErrorKind::UnexpectedEof));

    let (mut body_writer, mut body_reader) = io::duplex(32);
    body_writer.write_all(&[0, 2, b'x']).await.unwrap();
    body_writer.shutdown().await.unwrap();
    let truncated_body = read_frame_before(
        &mut body_reader,
        8,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(truncated_body, Err(FrameReadError::Io(error)) if error.kind() == io::ErrorKind::UnexpectedEof));

    let (mut bounded_writer, mut bounded_reader) = io::duplex(32);
    bounded_writer.write_all(&[0, 5, b'l', b'a', b't', b'e', b'r']).await.unwrap();
    let bounded = read_frame_before(
        &mut bounded_reader,
        4,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(bounded, Err(FrameReadError::Io(error)) if error.kind() == io::ErrorKind::InvalidData));
    let mut body = [0; 5];
    bounded_reader.read_exact(&mut body).await.unwrap();
    assert_eq!(&body, b"later");

    struct Broken;
    impl AsyncRead for Broken {
        fn poll_read(
            self: Pin<&mut Self>,
            _: &mut Context<'_>,
            _: &mut ReadBuf<'_>,
        ) -> Poll<io::Result<()>> {
            let _ = self;
            Poll::Ready(Err(io::Error::new(io::ErrorKind::ConnectionReset, "marker error")))
        }
    }
    let mut broken = Broken;
    let result = read_frame_before(&mut broken, 8, Instant::now() + Duration::from_secs(1)).await;
    assert!(matches!(result, Err(FrameReadError::Io(error)) if error.kind() == io::ErrorKind::ConnectionReset && error.to_string() == "marker error"));
}`;

const frameDeadlineBlankSolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt};
use tokio::time::{timeout_at, Instant};

#[derive(Debug)]
pub enum FrameWriteError {
    TooLarge,
    Timeout,
    Io(io::Error),
}

pub async fn write_frame_before<W>(
    writer: &mut W,
    body: &[u8],
    limit: usize,
    deadline: Instant,
) -> Result<(), FrameWriteError>
where
    W: AsyncWrite + Unpin,
{
    if body.len() > limit || body.len() > u16::MAX as usize {
        return Err(FrameWriteError::TooLarge);
    }
    let header = (body.len() as u16).to_be_bytes();
    match timeout_at(deadline, async {
        writer.write_all(&header).await?;
        writer.write_all(body).await?;
        writer.flush().await
    })
    .await
    {
        Ok(Ok(())) => Ok(()),
        Ok(Err(error)) => Err(FrameWriteError::Io(error)),
        Err(_) => Err(FrameWriteError::Timeout),
    }
}`;

const frameDeadlineBlankTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use std::time::Duration;
use tokio::io::{self, AsyncWrite};
use tokio::time::{advance, sleep, Instant, Sleep};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

struct SlowWriter {
    bytes: Vec<u8>,
    delay: Duration,
    wait: Option<Pin<Box<Sleep>>>,
}
impl SlowWriter {
    fn new(delay: Duration) -> Self {
        Self { bytes: Vec::new(), delay, wait: None }
    }
}
impl AsyncWrite for SlowWriter {
    fn poll_write(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        let this = self.get_mut();
        if this.wait.is_none() {
            this.wait = Some(Box::pin(sleep(this.delay)));
        }
        if this.wait.as_mut().expect("timer exists").as_mut().poll(context).is_pending() {
            return Poll::Pending;
        }
        this.wait = None;
        this.bytes.push(input[0]);
        Poll::Ready(Ok(1))
    }
    fn poll_flush(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

struct CollectWriter {
    bytes: Vec<u8>,
    flushes: usize,
    flush_error: Option<io::Error>,
}
impl CollectWriter {
    fn working() -> Self {
        Self { bytes: Vec::new(), flushes: 0, flush_error: None }
    }
}
impl AsyncWrite for CollectWriter {
    fn poll_write(
        self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        let this = self.get_mut();
        this.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let this = self.get_mut();
        this.flushes += 1;
        match this.flush_error.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => Poll::Ready(Ok(())),
        }
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

struct SlowFlushWriter {
    bytes: Vec<u8>,
    delay: Duration,
    wait: Option<Pin<Box<Sleep>>>,
}
impl SlowFlushWriter {
    fn new(delay: Duration) -> Self {
        Self { bytes: Vec::new(), delay, wait: None }
    }
}
impl AsyncWrite for SlowFlushWriter {
    fn poll_write(
        self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        let this = self.get_mut();
        this.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        let this = self.get_mut();
        if this.wait.is_none() {
            this.wait = Some(Box::pin(sleep(this.delay)));
        }
        if this.wait.as_mut().expect("timer exists").as_mut().poll(context).is_pending() {
            return Poll::Pending;
        }
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn writing_uses_the_same_absolute_budget_for_header_and_body() {
    let mut writer = SlowWriter::new(Duration::from_secs(4));
    let start = Instant::now();
    let deadline = start + Duration::from_secs(10);
    let mut writing = Box::pin(write_frame_before(&mut writer, b"z", 8, deadline));

    assert!(poll_once(writing.as_mut()).is_pending());
    advance(Duration::from_secs(4)).await;
    assert!(poll_once(writing.as_mut()).is_pending());
    advance(Duration::from_secs(4)).await;
    assert!(poll_once(writing.as_mut()).is_pending());
    advance(Duration::from_secs(2)).await;

    let result = writing.as_mut().await;
    drop(writing);
    assert!(matches!(result, Err(FrameWriteError::Timeout)));
    assert_eq!(Instant::now(), deadline);
    assert_eq!(writer.bytes, vec![0, 1]);
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn writes_successful_empty_and_nonempty_frames_before_flush() {
    let mut empty = CollectWriter::working();
    write_frame_before(
        &mut empty,
        b"",
        0,
        Instant::now() + Duration::from_secs(1),
    )
    .await
    .unwrap();
    assert_eq!(empty.bytes, vec![0, 0]);
    assert_eq!(empty.flushes, 1);

    let mut nonempty = CollectWriter::working();
    write_frame_before(
        &mut nonempty,
        b"ok",
        2,
        Instant::now() + Duration::from_secs(1),
    )
    .await
    .unwrap();
    assert_eq!(nonempty.bytes, vec![0, 2, b'o', b'k']);
    assert_eq!(nonempty.flushes, 1);
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn checks_all_size_limits_before_output_and_preserves_writer_and_flush_errors() {
    let mut too_small = CollectWriter::working();
    let result = write_frame_before(
        &mut too_small,
        b"toolong",
        2,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(result, Err(FrameWriteError::TooLarge)));
    assert!(too_small.bytes.is_empty());

    let mut over_u16 = CollectWriter::working();
    let body = vec![b'x'; u16::MAX as usize + 1];
    let result = write_frame_before(
        &mut over_u16,
        &body,
        body.len(),
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(result, Err(FrameWriteError::TooLarge)));
    assert!(over_u16.bytes.is_empty());

    struct Broken;
    impl AsyncWrite for Broken {
        fn poll_write(
            self: Pin<&mut Self>,
            _: &mut Context<'_>,
            _: &[u8],
        ) -> Poll<io::Result<usize>> {
            let _ = self;
            Poll::Ready(Err(io::Error::new(io::ErrorKind::BrokenPipe, "marker error")))
        }
        fn poll_flush(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            let _ = self;
            Poll::Ready(Ok(()))
        }
        fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            let _ = self;
            Poll::Ready(Ok(()))
        }
    }
    let mut broken = Broken;
    let result = write_frame_before(
        &mut broken,
        b"ok",
        8,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(result, Err(FrameWriteError::Io(error)) if error.kind() == io::ErrorKind::BrokenPipe && error.to_string() == "marker error"));

    let mut flush_broken = CollectWriter {
        bytes: Vec::new(),
        flushes: 0,
        flush_error: Some(io::Error::new(io::ErrorKind::ConnectionReset, "flush marker")),
    };
    let result = write_frame_before(
        &mut flush_broken,
        b"ok",
        8,
        Instant::now() + Duration::from_secs(1),
    )
    .await;
    assert!(matches!(result, Err(FrameWriteError::Io(error)) if error.kind() == io::ErrorKind::ConnectionReset && error.to_string() == "flush marker"));
    assert_eq!(flush_broken.bytes, vec![0, 2, b'o', b'k']);
    assert_eq!(flush_broken.flushes, 1);
}

#[tokio::test(flavor = "current_thread", start_paused = true)]
async fn pending_flush_consumes_the_same_deadline_as_header_and_body() {
    let mut writer = SlowFlushWriter::new(Duration::from_secs(11));
    let start = Instant::now();
    let deadline = start + Duration::from_secs(10);
    let mut writing = Box::pin(write_frame_before(&mut writer, b"", 0, deadline));

    assert!(poll_once(writing.as_mut()).is_pending());
    advance(Duration::from_secs(10)).await;
    let result = writing.as_mut().await;
    drop(writing);
    assert!(matches!(result, Err(FrameWriteError::Timeout)));
    assert_eq!(Instant::now(), deadline);
    assert_eq!(writer.bytes, vec![0, 0]);
}`;

const frameDeadlineReviewStarter = `use tokio::io::{self, AsyncReadExt};
use tokio::net::TcpStream;
use tokio::time::Instant;

#[derive(Debug)]
pub enum ReceiveError {
    Timeout,
    Io(io::Error),
}

pub async fn receive_header_or_discard(
    _stream: TcpStream,
    _deadline: Instant,
) -> Result<(TcpStream, u16), ReceiveError> {
    todo!("po timeout nie zwracaj streamu do retry")
}`;

const frameDeadlineReviewSolution = `use tokio::io::{self, AsyncReadExt};
use tokio::net::TcpStream;
use tokio::time::{timeout_at, Instant};

#[derive(Debug)]
pub enum ReceiveError {
    Timeout,
    Io(io::Error),
}

pub async fn receive_header_or_discard(
    mut stream: TcpStream,
    deadline: Instant,
) -> Result<(TcpStream, u16), ReceiveError> {
    match timeout_at(deadline, async {
        let mut header = [0; 2];
        stream.read_exact(&mut header).await?;
        Ok::<_, io::Error>(u16::from_be_bytes(header))
    })
    .await
    {
        Ok(Ok(length)) => Ok((stream, length)),
        Ok(Err(error)) => Err(ReceiveError::Io(error)),
        Err(_) => Err(ReceiveError::Timeout),
    }
}`;

const frameDeadlineReviewTests = `use std::net::Ipv4Addr;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;
use tokio::time::Instant;

#[tokio::test(flavor = "current_thread")]
async fn deadline_drops_the_tcp_connection_instead_of_returning_it_for_retry() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let (accepted_tx, accepted_rx) = oneshot::channel();
    let peer = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        accepted_tx.send(()).unwrap();
        let mut byte = [0; 1];
        assert_eq!(stream.read(&mut byte).await.unwrap(), 0);
    });

    let client = TcpStream::connect(address).await.unwrap();
    accepted_rx.await.unwrap();
    assert!(matches!(
        receive_header_or_discard(client, Instant::now()).await,
        Err(ReceiveError::Timeout),
    ));
    peer.await.unwrap();
}

#[tokio::test(flavor = "current_thread")]
async fn successful_frame_keeps_the_owned_stream_usable() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let peer = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        stream.write_all(&[0, 2]).await.unwrap();
        let mut suffix = [0; 1];
        stream.read_exact(&mut suffix).await.unwrap();
        assert_eq!(suffix, [b'x']);
    });

    let client = TcpStream::connect(address).await.unwrap();
    let (mut client, length) = receive_header_or_discard(
        client,
        Instant::now() + Duration::from_secs(1),
    )
    .await
    .unwrap();
    assert_eq!(length, 2);
    client.write_all(b"x").await.unwrap();
    peer.await.unwrap();
}`;

const admissionRun = `use std::sync::Arc;
use tokio::sync::Semaphore;

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let limit = Arc::new(Semaphore::new(1));
            let permit = Arc::clone(&limit).acquire_owned().await.unwrap();
            println!("active={}", 1 - limit.available_permits());
            drop(permit);
            println!("active={}", 1 - limit.available_permits());
        });
}`;

const admissionGateStarter = `use std::future::Future;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{OwnedSemaphorePermit, Semaphore, watch};

#[derive(Debug)]
pub enum AdmissionError {
    Stopped,
    Closed,
    Io(std::io::Error),
}

pub async fn accept_with_permit<F, MakeAccept>(
    _limit: Arc<Semaphore>,
    _stop: &mut watch::Receiver<bool>,
    _make_accept: MakeAccept,
) -> Result<(TcpStream, OwnedSemaphorePermit), AdmissionError>
where
    MakeAccept: FnOnce() -> F,
    F: Future<Output = std::io::Result<(TcpStream, SocketAddr)>>,
{
    todo!("najpierw permit, potem Future accept, a stop obserwuj w obu oczekiwaniach")
}`;

const admissionGateSolution = `use std::future::Future;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{OwnedSemaphorePermit, Semaphore, watch};

#[derive(Debug)]
pub enum AdmissionError {
    Stopped,
    Closed,
    Io(std::io::Error),
}

pub async fn accept_with_permit<F, MakeAccept>(
    limit: Arc<Semaphore>,
    stop: &mut watch::Receiver<bool>,
    make_accept: MakeAccept,
) -> Result<(TcpStream, OwnedSemaphorePermit), AdmissionError>
where
    MakeAccept: FnOnce() -> F,
    F: Future<Output = std::io::Result<(TcpStream, SocketAddr)>>,
{
    if *stop.borrow_and_update() {
        return Err(AdmissionError::Stopped);
    }

    let acquire = limit.acquire_owned();
    tokio::pin!(acquire);
    let permit = loop {
        tokio::select! {
            biased;
            changed = stop.changed() => match changed {
                Ok(()) if *stop.borrow_and_update() => return Err(AdmissionError::Stopped),
                Ok(()) => continue,
                Err(_) => return Err(AdmissionError::Stopped),
            },
            result = &mut acquire => match result {
                Ok(permit) => break permit,
                Err(_) => return Err(AdmissionError::Closed),
            },
        }
    };

    if *stop.borrow_and_update() {
        return Err(AdmissionError::Stopped);
    }

    let accept = make_accept();
    tokio::pin!(accept);
    loop {
        tokio::select! {
            biased;
            changed = stop.changed() => match changed {
                Ok(()) if *stop.borrow_and_update() => return Err(AdmissionError::Stopped),
                Ok(()) => continue,
                Err(_) => return Err(AdmissionError::Stopped),
            },
            accepted = &mut accept => {
                let (stream, _) = accepted.map_err(AdmissionError::Io)?;
                return Ok((stream, permit));
            }
        }
    }
}`;

const admissionGateTests = `use std::future::Future;
use std::net::{Ipv4Addr, SocketAddr};
use std::pin::Pin;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{watch, Semaphore};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[tokio::test(flavor = "current_thread")]
async fn already_observed_stop_wins_before_permit_or_accept_are_started() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let calls = Arc::new(AtomicUsize::new(0));
    let count_calls = Arc::clone(&calls);
    let limit = Arc::new(Semaphore::new(1));
    let (_stop_tx, mut stop_rx) = watch::channel(true);

    let result = accept_with_permit(Arc::clone(&limit), &mut stop_rx, || {
        count_calls.fetch_add(1, Ordering::SeqCst);
        listener.accept()
    })
    .await;
    assert!(matches!(result, Err(AdmissionError::Stopped)));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(limit.available_permits(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn dropped_stop_sender_interrupts_pending_permit_and_pending_accept() {
    let no_capacity = Arc::new(Semaphore::new(0));
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let mut waiting_permit = Box::pin(accept_with_permit(
        Arc::clone(&no_capacity),
        &mut stop_rx,
        || async { Err::<(TcpStream, SocketAddr), _>(std::io::Error::other("must not accept")) },
    ));
    assert!(poll_once(waiting_permit.as_mut()).is_pending());
    drop(stop_tx);
    assert!(matches!(waiting_permit.await, Err(AdmissionError::Stopped)));

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let capacity = Arc::new(Semaphore::new(1));
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let mut waiting_accept = Box::pin(accept_with_permit(
        Arc::clone(&capacity),
        &mut stop_rx,
        || listener.accept(),
    ));
    assert!(poll_once(waiting_accept.as_mut()).is_pending());
    assert_eq!(capacity.available_permits(), 0);
    drop(stop_tx);
    assert!(matches!(waiting_accept.await, Err(AdmissionError::Stopped)));
    assert_eq!(capacity.available_permits(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn no_accept_factory_runs_until_capacity_exists_even_after_false_stop_update() {
    let limit = Arc::new(Semaphore::new(0));
    let calls = Arc::new(AtomicUsize::new(0));
    let count_calls = Arc::clone(&calls);
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let mut admission = Box::pin(accept_with_permit(
        Arc::clone(&limit),
        &mut stop_rx,
        move || {
            count_calls.fetch_add(1, Ordering::SeqCst);
            std::future::pending::<std::io::Result<(TcpStream, SocketAddr)>>()
        },
    ));
    assert!(poll_once(admission.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    stop_tx.send(false).unwrap();
    assert!(poll_once(admission.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    limit.add_permits(1);
    assert!(poll_once(admission.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(limit.available_permits(), 0);
    stop_tx.send(true).unwrap();
    assert!(matches!(admission.await, Err(AdmissionError::Stopped)));
    assert_eq!(limit.available_permits(), 1);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn true_stop_interrupts_the_permit_wait_without_starting_accept() {
    let limit = Arc::new(Semaphore::new(0));
    let calls = Arc::new(AtomicUsize::new(0));
    let count_calls = Arc::clone(&calls);
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let mut admission = Box::pin(accept_with_permit(
        Arc::clone(&limit),
        &mut stop_rx,
        move || {
            count_calls.fetch_add(1, Ordering::SeqCst);
            std::future::pending::<std::io::Result<(TcpStream, SocketAddr)>>()
        },
    ));
    assert!(poll_once(admission.as_mut()).is_pending());
    stop_tx.send(true).unwrap();
    assert!(matches!(admission.await, Err(AdmissionError::Stopped)));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(limit.available_permits(), 0);
}

#[tokio::test(flavor = "current_thread")]
async fn false_stop_update_keeps_the_same_pending_accept_until_a_client_arrives() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let calls = Arc::new(AtomicUsize::new(0));
    let count_calls = Arc::clone(&calls);
    let limit = Arc::new(Semaphore::new(1));
    let (stop_tx, mut stop_rx) = watch::channel(false);
    let mut waiting_accept = Box::pin(accept_with_permit(
        Arc::clone(&limit),
        &mut stop_rx,
        || {
            count_calls.fetch_add(1, Ordering::SeqCst);
            listener.accept()
        },
    ));
    assert!(poll_once(waiting_accept.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(limit.available_permits(), 0);

    stop_tx.send(false).unwrap();
    assert!(poll_once(waiting_accept.as_mut()).is_pending());
    assert_eq!(calls.load(Ordering::SeqCst), 1);

    let connecting = TcpStream::connect(address);
    let (client, accepted) = tokio::join!(connecting, &mut waiting_accept);
    let client = client.unwrap();
    let (server, permit) = accepted.unwrap();
    drop(client);
    drop(server);
    drop(permit);
    assert_eq!(limit.available_permits(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn failed_accept_releases_capacity_and_success_returns_stream_with_its_permit() {
    let closed = Arc::new(Semaphore::new(1));
    closed.close();
    let (_stop_tx, mut stop_rx) = watch::channel(false);
    let closed_result = accept_with_permit(Arc::clone(&closed), &mut stop_rx, || async {
        Err::<(TcpStream, SocketAddr), _>(std::io::Error::other("must not accept"))
    })
    .await;
    assert!(matches!(closed_result, Err(AdmissionError::Closed)));

    let limit = Arc::new(Semaphore::new(1));
    let (_stop_tx, mut stop_rx) = watch::channel(false);
    let failed = accept_with_permit(Arc::clone(&limit), &mut stop_rx, || async {
        Err::<(TcpStream, SocketAddr), _>(std::io::Error::other("accept marker"))
    })
    .await;
    assert!(matches!(failed, Err(AdmissionError::Io(error)) if error.to_string() == "accept marker"));
    assert_eq!(limit.available_permits(), 1);

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let success_limit = Arc::new(Semaphore::new(1));
    let (_stop_tx, mut stop_rx) = watch::channel(false);
    let connecting = TcpStream::connect(address);
    let accepting = accept_with_permit(Arc::clone(&success_limit), &mut stop_rx, || listener.accept());
    let (client, accepted) = tokio::join!(connecting, accepting);
    let client = client.unwrap();
    let (server, permit) = accepted.unwrap();
    assert_eq!(success_limit.available_permits(), 0);
    drop(client);
    drop(server);
    drop(permit);
    assert_eq!(success_limit.available_permits(), 1);
}`;

const admissionBlankSolution = `use std::future::Future;
use tokio::net::TcpStream;
use tokio::sync::OwnedSemaphorePermit;
use tokio::task::JoinHandle;

pub fn spawn_admitted_handler<F, Handler>(
    stream: TcpStream,
    permit: OwnedSemaphorePermit,
    handler: F,
) -> JoinHandle<std::io::Result<()>>
where
    F: FnOnce(TcpStream) -> Handler + Send + 'static,
    Handler: Future<Output = std::io::Result<()>> + Send + 'static,
{
    tokio::spawn(async move {
        let _permit = permit;
        handler(stream).await
    })
}`;

const admissionBlankTests = `use std::net::Ipv4Addr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Semaphore};

async fn connected_pair(listener: &TcpListener) -> (TcpStream, TcpStream) {
    let address = listener.local_addr().unwrap();
    let connecting = TcpStream::connect(address);
    let accepting = listener.accept();
    let (client, accepted) = tokio::join!(connecting, accepting);
    (client.unwrap(), accepted.unwrap().0)
}

#[tokio::test(flavor = "current_thread")]
async fn real_handler_keeps_permit_until_successful_completion() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let (mut client, server) = connected_pair(&listener).await;
    let limit = Arc::new(Semaphore::new(1));
    let permit = Arc::clone(&limit).acquire_owned().await.unwrap();
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let handler = spawn_admitted_handler(server, permit, move |mut stream| async move {
        started_tx.send(()).unwrap();
        release_rx.await.unwrap();
        let mut byte = [0; 1];
        stream.read_exact(&mut byte).await?;
        assert_eq!(byte, [b'x']);
        Ok(())
    });

    started_rx.await.unwrap();
    assert_eq!(limit.available_permits(), 0);
    client.write_all(b"x").await.unwrap();
    release_tx.send(()).unwrap();
    handler.await.unwrap().unwrap();
    assert_eq!(limit.available_permits(), 1);
}

#[tokio::test(flavor = "current_thread")]
async fn real_handler_keeps_permit_until_error_is_reported() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let (_client, server) = connected_pair(&listener).await;
    let limit = Arc::new(Semaphore::new(1));
    let permit = Arc::clone(&limit).acquire_owned().await.unwrap();
    let (started_tx, started_rx) = oneshot::channel();
    let (release_tx, release_rx) = oneshot::channel();
    let handler = spawn_admitted_handler(server, permit, move |_stream| async move {
        started_tx.send(()).unwrap();
        release_rx.await.unwrap();
        Err(std::io::Error::new(std::io::ErrorKind::BrokenPipe, "handler marker"))
    });

    started_rx.await.unwrap();
    assert_eq!(limit.available_permits(), 0);
    release_tx.send(()).unwrap();
    let error = handler.await.unwrap().unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::BrokenPipe);
    assert_eq!(error.to_string(), "handler marker");
    assert_eq!(limit.available_permits(), 1);
}`;

const admissionReviewStarter = `use tokio::net::TcpListener;
use tokio::task::{JoinError, JoinHandle};

pub async fn close_listener_then_join<T>(
    _listener: TcpListener,
    _tasks: Vec<JoinHandle<T>>,
) -> Result<Vec<T>, JoinError>
where
    T: Send + 'static,
{
    todo!("najpierw zatrzymaj accept, potem odbierz każdy JoinHandle")
}`;

const admissionReviewSolution = `use tokio::net::TcpListener;
use tokio::task::{JoinError, JoinHandle};

pub async fn close_listener_then_join<T>(
    listener: TcpListener,
    tasks: Vec<JoinHandle<T>>,
) -> Result<Vec<T>, JoinError>
where
    T: Send + 'static,
{
    drop(listener);
    let mut results = Vec::with_capacity(tasks.len());
    let mut first_error = None;
    for task in tasks {
        match task.await {
            Ok(result) => results.push(result),
            Err(error) if first_error.is_none() => first_error = Some(error),
            Err(_) => {}
        }
    }
    match first_error {
        Some(error) => Err(error),
        None => Ok(results),
    }
}`;

const admissionReviewTests = `use std::future::Future;
use std::net::Ipv4Addr;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[tokio::test(flavor = "current_thread")]
async fn closes_listener_before_waiting_for_an_admitted_child() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let (release_tx, release_rx) = oneshot::channel();
    let child = tokio::spawn(async move {
        release_rx.await.unwrap();
        String::from("joined")
    });
    let mut shutdown = Box::pin(close_listener_then_join(listener, vec![child]));

    assert!(poll_once(shutdown.as_mut()).is_pending());
    let replacement = TcpListener::bind(address)
        .await
        .expect("listener must be dropped before join waits");
    release_tx.send(()).unwrap();
    assert_eq!(shutdown.await.unwrap(), vec![String::from("joined")]);
    drop(replacement);
}

#[tokio::test(flavor = "current_thread")]
async fn preserves_join_error_instead_of_claiming_a_clean_shutdown() {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let (panicked_tx, panicked_rx) = oneshot::channel();
    let early_panic = tokio::spawn(async move {
        panicked_tx.send(()).unwrap();
        panic!("accepted handler panicked");
    });
    panicked_rx.await.unwrap();

    let (release_tx, release_rx) = oneshot::channel();
    let later_child = tokio::spawn(async move {
        release_rx.await.unwrap();
        String::from("late child joined")
    });
    let mut shutdown = Box::pin(close_listener_then_join(
        listener,
        vec![early_panic, later_child],
    ));
    assert!(poll_once(shutdown.as_mut()).is_pending());
    release_tx.send(()).unwrap();
    let result = shutdown.await;
    assert!(result.unwrap_err().is_panic());
}`;

export const tokioNetworkLifecycleLessons: Lesson[] = [
  {
    id: "tokio-frame-deadlines",
    moduleId: "tokio-network-service",
    conceptIds: ["tokio-frame-absolute-deadline"],
    competencyIds: ["frame-under-one-tokio-deadline"],
    prerequisites: ["tokio-tcp-half-close"],
    title: "Jedna granica czasu dla całej ramki",
    subtitle:
      "Policzysz header, body i flush w jednym budżecie oraz po niedokończonej ramce świadomie odrzucisz połączenie.",
    minutes: 34,
    outcomes: [
      "Utworzysz absolutny `Instant` przed pierwszym odczytem lub zapisem ramki.",
      "Zachowasz oddzielnie `Elapsed`, clean EOF, truncated data, granicę długości i własny `io::Error`.",
      "Wyjaśnisz, dlaczego timeout przerwał oczekiwanie, ale nie cofnął częściowych bajtów streamu.",
    ],
    steps: [
      choose(
        "tokio-frame-deadlines-predict",
        "predict",
        "Czy szybkie porcje zawsze mieszczą się w deadline?",
        "Każda kolejna porcja ramki przychodzi po 4 s, a limit całej ramki to 10 s. Czy wolno stworzyć nowy `timeout(Duration::from_secs(10), ...)` po każdej porcji?",
        2,
        [
          "Tak, bo żadna pojedyncza porcja nie czeka 10 s.",
          "Tak, gdy użyję `flush` między porcjami.",
          "Nie. Jeden Instant sprzed pierwszej porcji kończy całą ramkę po 10 s.",
        ],
        [
          "Odnowienie Duration zmienia kontrakt: peer może wydłużać transfer każdą krótką porcją.",
          "Flush przekazuje bufory, lecz nie odnawia ani nie zamyka budżetu czasu ramki.",
          "Tak. Wszystkie oczekiwania porównujesz z tym samym punktem czasu, a nie z nowym zegarem dla każdego kawałka.",
        ],
      ),
      tokioRun(
        "tokio-frame-deadlines-run",
        "Odczytaj ramkę przed punktem czasu",
        "Uruchom prostą ramkę. `timeout_at` obejmuje jednocześnie oba odczyty. W zadaniu rozszerzysz to o EOF, limit i niedokończone ramki; tu odkrywasz najpierw kształt jednego wspólnego Future.",
        deadlineRun,
        "body=ok\n",
      ),
      choose(
        "tokio-frame-deadlines-errors",
        "explain",
        "Który wynik opisuje co?",
        "Ramka nie zakończyła się przed deadline, a inna próba zwróciła `ConnectionReset`. Jak powinien wyglądać API result?",
        1,
        [
          "Oba wyniki zamieniam w `io::ErrorKind::TimedOut`, aby caller miał jeden wariant.",
          "Zwracam osobne `Timeout` dla Elapsed oraz posiadany `io::Error` dla transportu.",
          "Po każdym błędzie zwracam pustą ramkę i próbuję z tym samym streamem od początku.",
        ],
        [
          "To usuwa informację, czy polityka czasu czy transport zakończyły operację.",
          "Tak. Timeout jest decyzją naszej polityki oczekiwania, natomiast error transportu ma własny kind i kontekst.",
          "Pusty body nie oznacza niedokończonego headera ani resetu; retry od początku może zduplikować lub przesunąć protokół.",
        ],
      ),
      tokioExercise({
        id: "tokio-frame-deadlines-gate",
        kind: "modify",
        title: "Odczytaj ograniczoną ramkę przed jednym deadline",
        prompt:
          "Uzupełnij `read_frame_before`. Protokół to `[u16 big-endian][body]`; funkcja ma być generyczna dla `AsyncRead`. Caller przekazuje już wybrany absolutny `Instant`, a jeden `timeout_at` ma objąć wszystkie odczyty headera i body. Zwróć None wyłącznie dla EOF przed pierwszym bajtem headera; częściowy header lub body to `UnexpectedEof`; długość ponad limit odrzuć przed Vec i pozostaw body nieprzeczytane. `FrameReadError::Timeout` musi pozostać inny niż własny `FrameReadError::Io`. Test zatrzymuje zegar i ręcznie przesuwa go przez porcje co 4 s: każda przerwa jest krótsza niż 10 s, lecz po 10 s upływa wspólny czas na odczyt i ramka pozostaje niepełna. Oczekiwany wynik to Timeout, a nie udana ramka. Po `Timeout` caller ma upuścić TCP connection — nie obiecuj retry tej niedokończonej ramki na tym samym streamie.",
        code: frameDeadlineGateStarter,
        solution: frameDeadlineGateSolution,
        tests: frameDeadlineGateTests,
        hints: [
          "Zbuduj jedno async `read_one`, a dopiero potem owiń je `timeout_at(deadline, read_one)`.",
          "EOF rozpoznaj w pętlach przez liczniki wypełnionych header/body; w zewnętrznym match zachowaj osobny wariant Elapsed.",
        ],
        forbiddenPatterns: [
          "timeout(Duration",
          "Instant::now() +",
          ".read_exact(",
          ".read_to_end(",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-frame-deadlines-blank",
        kind: "blank",
        title: "Od pustej kartki: zapisz ramkę w tym samym budżecie",
        prompt:
          "Od pustej kartki zdefiniuj `FrameWriteError` i generyczną `write_frame_before`. Przyjmuje `AsyncWrite`, body, limit i jeden absolutny `Instant`. Przed pierwszym write sprawdź limit aplikacji oraz u16; dla poprawnej ramki header, body i flush należą do pojedynczego `timeout_at`. Zachowaj `TooLarge`, `Timeout` i własny `io::Error` jako różne wyniki. Test kontroluje trzy kolejne write co 4 s przy deadline 10 s, więc poprawna implementacja timeoutuje po headerze, zanim wyśle body. Nie odnawiaj czasu na write i nie próbuj kontynuować tej ramki po Timeout: właściciel ma odrzucić połączenie z częściowym outputem.",
        solution: frameDeadlineBlankSolution,
        tests: frameDeadlineBlankTests,
        hints: [
          "Walidacja `body.len()` musi zakończyć funkcję, zanim zbudujesz header i zanim writer zobaczy bajt.",
          "Przenieś `write_all(header)`, `write_all(body)` i `flush` do jednego async bloku przekazanego do `timeout_at`.",
        ],
        forbiddenPatterns: [
          "timeout(Duration",
          "Instant::now() +",
          "std::thread",
          "sleep(",
          "yield_now",
        ],
        gate: true,
      }),
      choose(
        "tokio-frame-deadlines-discard",
        "recall",
        "Co robisz z Timeout w środku ramki?",
        "`write_all` zapisał header i czeka na body, gdy `timeout_at` zwraca Elapsed. Która polityka chroni kolejne żądanie?",
        0,
        [
          "Upuszczam całe połączenie; bez trwałego stanu offsetu nie wiem, jak dokończyć tę ramkę.",
          "Wysyłam drugi header na tym samym streamie i traktuję go jako retry.",
          "Wysyłam pusty body, aby peer sam odgadł brakujące bajty.",
        ],
        [
          "Tak. Częściowy output nie jest transakcją. Późniejszy protocol może użyć jawnego caller-owned stanu wznawiania, ale ten kontrakt bezpiecznie odrzuca connection.",
          "Peer może już oczekiwać body po pierwszym headerze; drugi header zmienia znaczenie pozostałych bajtów.",
          "Pusty body jest inną ramką tylko wtedy, gdy był poprawnie zakodowany od początku, nie naprawą przerwanej ramki.",
        ],
      ),
      ownedFrameDiscardTransfer,
    ],
    misconceptions: [
      "Nowy timeout dla każdej porcji nadal ogranicza czas całej ramki.",
      "Elapsed i error transportu są tym samym błędem do ukrycia za tekstem.",
      "Timeout cofa header albo prefix body, który zdążył przejść przez stream.",
      "Flush potwierdza przetworzenie komunikatu przez zdalną aplikację.",
    ],
    transferTask:
      "Projektujesz klienta, który wysyła ramkę żądania i czyta ramkę odpowiedzi z budżetem 750 ms. Wskaż jeden moment utworzenia Instant, granice obu formatów, wyniki API dla Elapsed i ConnectionReset oraz dokładny moment upuszczenia TcpStream po częściowej ramce.",
    evidenceGate:
      "tokio-frame-deadlines-gate ręcznie przesuwa zatrzymany zegar przez porcje krótsze od deadline, lecz przekraczające jego sumę; sprawdza także EOF, ucięcie, limit i własny io::Error. tokio-frame-deadlines-blank niezależnie sprawdza header/body/flush pod tym samym Instant oraz brak outputu dla oversize. Zadanie `tokio-frame-deadlines-owned-discard-transfer` przyjmuje całe połączenie i zwraca je tylko z kompletną ramką; testuje też EOF peer-a po błędzie. Powtórka `review-tokio-frame-absolute-deadline` używa prawdziwego loopback TCP i sprawdza, że timeout upuszcza stream, zaś sukces zwraca nadal używalny stream.",
    sourceIds: [
      "tokio-timeout-at",
      "tokio-time-instant",
      "tokio-network-lifecycle-tcp-stream",
    ],
  },
  {
    id: "tokio-admission-lifecycle",
    moduleId: "tokio-network-service",
    conceptIds: ["tokio-admission-permit-lifetime"],
    competencyIds: ["admit-tcp-work-through-completion"],
    prerequisites: ["tokio-tcp-half-close"],
    title: "Admission przed accept, permit do końca handlera",
    subtitle:
      "Zatrzymasz nowe accept przez stop, oddzielisz backlog kernela od aktywnej pracy i rozliczysz każde wpuszczone połączenie.",
    minutes: 38,
    outcomes: [
      "Poczekasz na `OwnedSemaphorePermit` zanim utworzysz Future accept i pozwolisz stopowi przerwać oba oczekiwania.",
      "Przeniesiesz stream oraz permit razem do taska handlera i utrzymasz limit przez sukces albo błąd.",
      "Przed join dzieci upuścisz listener, a JoinError zachowasz jako wynik shutdown.",
    ],
    steps: [
      choose(
        "tokio-admission-lifecycle-predict",
        "predict",
        "Co właściwie ogranicza semaphore?",
        "Listener ma backlog w kernelu, a semaphore ma 3 permit. Pięciu klientów zakończyło TCP connect, lecz aplikacja uruchomiła trzy handlery. Co opisuje `available_permits() == 0`?",
        1,
        [
          "W backlogu nie ma już żadnego klienta.",
          "Trzy aktywnie wpuszczone przez aplikację handlery zachowują permit; backlog jest osobnym stanem OS.",
          "Każdy klient został już zaakceptowany i dostał task handlera.",
        ],
        [
          "Backlog należy do listen socket OS i może nadal zawierać połączenia oczekujące na accept.",
          "Tak. Semaphore nie mierzy TCP handshake ani długości kolejki kernela; jest polityką admission aplikacji.",
          "Bez permitu nie zaczynamy accept, więc część klientów może jeszcze oczekiwać poza zestawem handlerów.",
        ],
      ),
      tokioRun(
        "tokio-admission-lifecycle-run",
        "Zobacz własność pojedynczego permitu",
        "Uruchom przykład. Licznik aktywnej pracy zmienia się tylko w chwili posiadania permitu. W następnych krokach przeniesiesz tę własność przez accept i task handlera.",
        admissionRun,
        "active=1\nactive=0\n",
      ),
      choose(
        "tokio-admission-lifecycle-stop",
        "explain",
        "Który stop ma pierwszeństwo?",
        "Receiver stopu ma już wartość true, gdy pętla admission rozpoczyna kolejną iterację, a backlog zawiera gotowe połączenie. Co ma nastąpić?",
        2,
        [
          "Rozpocznij accept, bo połączenie jest gotowe i będzie szybsze.",
          "Poczekaj na permit, potem sprawdź stop po spawn handlera.",
          "Zwróć stop zanim czekasz na permit lub wywołasz factory accept.",
        ],
        [
          "To wpuszcza nową pracę mimo widocznej już decyzji shutdown.",
          "Task mógłby zostać utworzony po stopie, a kolejka permitów nie jest punktem startu pracy.",
          "Tak. To jawny priorytet widocznego stopu nad wszystkimi kolejnymi admission.",
        ],
      ),
      tokioExercise({
        id: "tokio-admission-lifecycle-gate",
        kind: "modify",
        title: "Zdobądź permit przed accept i obserwuj stop",
        prompt:
          "Uzupełnij `accept_with_permit`. Otrzymuje `Arc<Semaphore>`, mutable `watch::Receiver<bool>` stopu i `make_accept`, które tworzy Future prawdziwego `TcpListener::accept`. Jeśli stop true był widoczny przed startem, ma pierwszeństwo: nie zdobywaj permitu i nie wołaj `make_accept`. W przeciwnym razie najpierw awaituj `acquire_owned`, potem utwórz i zachowaj jeden Future accept. W obu oczekiwaniach stop true albo Drop ostatniego Sendera oznacza jawne `Stopped`; zmiana na false nie może zgubić oczekiwania. Własny error accept pozostaje `Io`, zamknięty semaphore to `Closed`, a błąd/stop podczas accept zwalnia permit. Test ręcznie odpytuje pending permit i pending accept przed Drop Sendera, wymusza błąd accept oraz pokrywa sukces na prawdziwym IPv4 loopback bez stałego portu.",
        code: admissionGateStarter,
        solution: admissionGateSolution,
        tests: admissionGateTests,
        hints: [
          "Sprawdź `*stop.borrow_and_update()` przed stworzeniem acquire i ponownie po zdobyciu permitu.",
          "Przypnij acquire i accept do lokalnych zmiennych. W `select!` zatrzymaj się przy true lub Err z `changed`; dla false wróć do oczekiwania na ten sam Future.",
        ],
        forbiddenPatterns: [
          "try_recv",
          "sleep(",
          "yield_now",
          "std::thread",
          "std::mem::forget",
          "mem::forget",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-admission-lifecycle-blank",
        kind: "blank",
        title: "Od pustej kartki: handler jest właścicielem permitu",
        prompt:
          "Od pustej kartki napisz `spawn_admitted_handler`. Przyjmuje zaakceptowany `TcpStream`, `OwnedSemaphorePermit` i async handler, a zwraca prawdziwy `JoinHandle<io::Result<()>>`. Przenieś wszystkie trzy do taska Tokio. Permit ma zostać lokalną własnością taska aż handler zwróci sukces albo własny błąd; outer helper nie może go upuścić po spawn. Test tworzy rzeczywiste pary TCP na `127.0.0.1:0`, zatrzymuje handler kanałem po potwierdzonym starcie, a następnie sprawdza pojemność przed i po success oraz przed i po błędzie. Nie zastępuj taska bezpośrednim await ani nie ukrywaj błędu handlera.",
        solution: admissionBlankSolution,
        tests: admissionBlankTests,
        hints: [
          "Granice `tokio::spawn` wymagają posiadania streamu, permitu i closure; nazwij permit `_permit` wewnątrz async move.",
          "Nie awaituj handlera przed spawn. To JoinHandle ma opisać jego faktyczny sukces, błąd albo późniejszy JoinError.",
        ],
        forbiddenPatterns: [
          "std::mem::forget",
          "mem::forget",
          ".abort(",
          "::abort",
          "sleep(",
          "yield_now",
        ],
        gate: true,
      }),
      choose(
        "tokio-admission-lifecycle-drain",
        "recall",
        "Jaka jest kolejność shutdown?",
        "Masz listener i Vec JoinHandle już zaakceptowanych handlerów. Który krok zapobiega nowemu admission, zanim zaczniesz czekać na stare dzieci?",
        0,
        [
          "Najpierw upuść listener, potem odbierz wszystkie JoinHandle i zachowaj ewentualny JoinError.",
          "Najpierw awaituj wszystkie dzieci; listener sam przestanie accept, gdy semaphore będzie pełny.",
          "Odłącz JoinHandle przez Drop i pozostaw listener systemowi operacyjnemu.",
        ],
        [
          "Tak. Stop admission i drain zaakceptowanej pracy są różnymi fazami; JoinError oznacza, że raport shutdown nie jest czystym sukcesem.",
          "W czasie join listener nadal może tworzyć kolejne połączenia i przedłużać zamknięcie.",
          "Drop JoinHandle nie odbiera raportu dziecka, a Drop listenera nie joinuje tasków.",
        ],
      ),
    ],
    misconceptions: [
      "TCP backlog jest tym samym limitem co liczba aktywnych handlerów aplikacji.",
      "Można acceptować bez końca i dopiero potem zostawiać taski w kolejce Semaphore.",
      "Permit może zostać w outer Future, bo JoinHandle już reprezentuje handler.",
      "Drop Sendera stopu jest błędem infrastruktury, który należy ignorować i dalej acceptować.",
      "Join wszystkich dzieci przed zamknięciem listenera zatrzymuje nowe admission.",
    ],
    transferTask:
      "Projektujesz loopback service z limitem 32 aktywnych żądań. Opisz miejsce `acquire_owned`, moment utworzenia Future accept, politykę true i Drop Sendera stopu, własność `(TcpStream, permit)` oraz kolejność: zatrzymanie listenera, drain dzieci, raport io::Error i JoinError. Wskaż też, dlaczego licznik aktywnych handlerów nie mówi nic pewnego o backlogu OS.",
    evidenceGate:
      "tokio-admission-lifecycle-gate ręcznie odpytuje oba oczekiwania, więc Drop Sendera stopu kończy permit wait i accept wait bez watchdogów; sprawdza preobserved stop, zwolnienie po błędzie accept oraz realny loopback success. tokio-admission-lifecycle-blank utrzymuje permit w rzeczywistym spawned handlerze do success/error. Powtórka `review-tokio-admission-permit-lifetime` najpierw upuszcza listener i dopiero potem joinuje dzieci, zachowując JoinError.",
    sourceIds: [
      "tokio-network-lifecycle-tcp-listener",
      "tokio-network-lifecycle-tcp-stream",
      "tokio-semaphore",
      "tokio-owned-semaphore-permit",
      "tokio-watch-receiver",
      "tokio-join-handle-network",
    ],
  },
];

export const tokioNetworkLifecycleReviewExercises: Record<string, LessonStep> =
  {
    "tokio-frame-absolute-deadline": tokioExercise({
      id: "review-tokio-frame-absolute-deadline",
      kind: "debug",
      title: "Przegląd kodu: po deadline nie oddawaj częściowego streamu",
      prompt:
        "Popraw `receive_header_or_discard`. Funkcja posiada TcpStream i ma jeden absolutny deadline na header. Przy sukcesie zwraca nadal używalny stream wraz z długością; przy `io::Error` albo `Timeout` nie zwraca streamu, więc Drop kończy niedokończoną sesję zamiast obiecywać retry. Test używa prawdziwego retained listenera na IPv4 loopback: po natychmiastowym deadline peer musi dostać EOF, zaś po sukcesie client wysyła jeszcze suffix. Nie używaj nowego timeoutu, taska odłączonego od właściciela ani retry po Elapsed.",
      code: frameDeadlineReviewStarter,
      solution: frameDeadlineReviewSolution,
      tests: frameDeadlineReviewTests,
      hints: [
        "Napisz `mut stream`, umieść `read_exact` w jednym `timeout_at`, a stream przenieś do Ok wyłącznie po pełnym headerze.",
        "W obu Err nie ma wartości TcpStream w return type. Wyjście z funkcji upuszcza posiadany stream i sygnalizuje EOF peerowi.",
      ],
      forbiddenPatterns: [
        "timeout(Duration",
        "tokio::spawn",
        "sleep(",
        "yield_now",
        "retry",
      ],
    }),
    "tokio-admission-permit-lifetime": tokioExercise({
      id: "review-tokio-admission-permit-lifetime",
      kind: "debug",
      title: "Przegląd kodu: zamknij listener przed join dzieci",
      prompt:
        "Popraw `close_listener_then_join`. Posiada listener i JoinHandle już zaakceptowanych handlerów. Najpierw upuść listener, aby nowe accept nie przedłużały drain, potem awaituj każdy handle. Jeśli któryś zwróci `JoinError`, zapamiętaj pierwszy, ale nadal joinuj wszystkie późniejsze dzieci; na końcu zwróć ten zachowany pełny `JoinError` zamiast panic, unwrap albo udawanego sukcesu. Test kontrolowanym pollem wstrzymuje późniejsze dziecko po potwierdzonym panic pierwszego: shutdown musi zostać pending do release. Osobny test sprawdza wcześniejsze upuszczenie listenera przez ponowny bind loopback. Nie używaj abort, `JoinSet` ani odłączania handle.",
      code: admissionReviewStarter,
      solution: admissionReviewSolution,
      tests: admissionReviewTests,
      hints: [
        "`drop(listener)` wykonaj przed pierwszym await. Wtedy pierwszy poll helpera już zamyka port, ale nadal czeka na dziecko.",
        "W pętli zapisuj pierwszy JoinError w `Option`, lecz nie wykonuj wczesnego return: każdy JoinHandle musi zostać awaitowany przed zwróceniem błędu.",
      ],
      forbiddenPatterns: [
        ".abort(",
        "::abort",
        "JoinSet",
        "std::mem::forget",
        "mem::forget",
        "sleep(",
        "yield_now",
      ],
    }),
  };
