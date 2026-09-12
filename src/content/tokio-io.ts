import { choose, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const tokioIoSources: Source[] = [
  {
    id: "tokio-async-read",
    title: "Tokio 1.53.1: io::AsyncRead",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/trait.AsyncRead.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu poll_read, ReadBuf albo implementacji własnych readerów.",
  },
  {
    id: "tokio-async-write",
    title: "Tokio 1.53.1: io::AsyncWrite",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/trait.AsyncWrite.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu poll_write, flush, shutdown albo implementacji własnych writerów.",
  },
  {
    id: "tokio-async-read-ext",
    title: "Tokio 1.53.1: io::AsyncReadExt",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/trait.AsyncReadExt.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki read, EOF, cancellation safety lub read_exact/read_to_end.",
  },
  {
    id: "tokio-async-write-ext",
    title: "Tokio 1.53.1: io::AsyncWriteExt",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/trait.AsyncWriteExt.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki write, write_all, flush, shutdown albo cancellation safety.",
  },
  {
    id: "tokio-duplex",
    title: "Tokio 1.53.1: io::duplex",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/fn.duplex.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie pojemności, backpressure lub zachowania połówek DuplexStream.",
  },
];

export const tokioIoCompetencies: Competency[] = [
  {
    id: "write-complete-tokio-streams",
    title: "Wysyłasz pełne bajty i kończysz write half świadomie.",
  },
  {
    id: "decode-bounded-tokio-frames",
    title: "Dekodujesz ograniczone ramki, odróżniając EOF od uszkodzenia.",
  },
  {
    id: "retain-tokio-stream-progress",
    title: "Zachowujesz postęp czytania i pisania po anulowaniu Future.",
  },
];

export const tokioIoConcepts: Concept[] = [
  {
    id: "tokio-duplex-read-write",
    title: "Częściowy odczyt i zapis",
    prerequisites: ["tokio-graceful-shutdown"],
    competencyIds: ["write-complete-tokio-streams"],
    reviewPrompt:
      "Dlaczego `write` nie jest obietnicą pełnej odpowiedzi, co dopowiada `write_all`, a czym różni się `shutdown` od samego flush dla drugiej strony duplex?",
    reviewAnswer:
      "Jedno `write` może przekazać tylko prefiks slice; w duplex mała pojemność daje naturalny przykład takiego backpressure. `write_all` powtarza write, aż przekaże cały slice lub otrzyma błąd, a flush domyka buforowanie writer-a. `shutdown` dodatkowo zamyka write half, dlatego peer po odebraniu istniejących bajtów widzi EOF. Pełny `write_all` jest wygodny dla operacji, którą czekasz do końca; nie jest sam w sobie stanem do bezpiecznego wznowienia po anulowaniu.",
    distinguish:
      "AsyncRead i AsyncWrite opisują transport porcji bajtów, nie granice wiadomości. Granicę trzeba określić w protokole albo limicie transferu. `read` i pojedynczy `write` są cancellation safe jako pojedyncze oczekiwania Tokio, lecz Future z lokalną pętlą może już mieć ukryty postęp; trwały postęp przeniesiemy do stanu w trzeciej lekcji.",
  },
  {
    id: "tokio-bounded-frame-eof",
    title: "Granice ramki i EOF",
    prerequisites: ["tokio-duplex-read-write"],
    competencyIds: ["decode-bounded-tokio-frames"],
    reviewPrompt:
      "Kiedy dekoder ramki `[u16 big-endian][body]` zwraca None, kiedy UnexpectedEof i dlaczego musi porównać długość z limitem przed utworzeniem Vec?",
    reviewAnswer:
      "None oznacza wyłącznie EOF przed pierwszym bajtem następnego dwubajtowego nagłówka. Jeden bajt nagłówka albo niepełne body to już UnexpectedEof, bo rozpoczęta ramka nie ma pełnego kształtu. Długość trzeba sprawdzić przed alokacją i zanim odczytasz body: wtedy deklaracja o wielkości większej od limitu nie zamienia się w niekontrolowaną rezerwację pamięci ani nie zjada danych kolejnego kroku protokołu.",
    distinguish:
      "EOF jest wynikiem transportu, a granica ramki jest regułą protokołu. Długość u16 ogranicza format do 65535 bajtów, ale aplikacja ma własny, zwykle mniejszy limit. Ten prosty dekoder ma postęp lokalnie w Future, więc wywołujący powinien awaitować go do wyniku; nie wkładaj go jako anulowanej gałęzi select. `read_exact` i `read_to_end` także nie dają wywołującemu odzyskiwalnego postępu po anulowaniu.",
  },
  {
    id: "tokio-cancellation-safe-frame-progress",
    title: "Postęp poza Future",
    prerequisites: ["tokio-bounded-frame-eof"],
    competencyIds: ["retain-tokio-stream-progress"],
    reviewPrompt:
      "Dlaczego zapisanie headera, body i offsetu w FrameState/PendingWrite pozwala wznowić po Drop Future, a lokalne Vec w read_exact, read_to_end lub write_all tego nie zapewnia?",
    reviewAnswer:
      "Tokio gwarantuje cancellation safety pojedynczego read i write: gdy to oczekiwanie zostanie porzucone w Pending, nie przeniosło bajtów. Gdy read lub write zwróci Ready, nasz kod natychmiast kopiuje wynik do FrameState albo przesuwa offset PendingWrite, więc następne Future widzi dokładny postęp. read_exact, read_to_end i write_all ukrywają wiele takich kroków w swoim Future; Drop tego Future usuwa lokalny bufor lub offset, chociaż wcześniejsze kroki mogły już zmienić stream.",
    distinguish:
      "Cancellation safety pojedynczej metody nie robi automatycznie cancellation safe całej pętli aplikacji. Wznowienie wymaga stanu należącego do wywołującego: na odczycie przechowuje już zebrane bajty, a na zapisie niezmieniony prefix i liczbę przekazanych bajtów. To jest protokół wznawiania, nie obietnica atomowego cofnięcia I/O.",
  },
];

const partialWriteRun = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let (mut writer, mut reader) = io::duplex(2);
            let written = writer.write(b"rust").await.unwrap();
            let mut bytes = [0; 2];
            let read = reader.read(&mut bytes).await.unwrap();
            println!("written={written}");
            println!("read={read}, bytes={}", String::from_utf8_lossy(&bytes));
        });
}`;

const writeReplyStarter = `use tokio::io::{self, AsyncWrite, AsyncWriteExt};

pub async fn write_reply<W>(writer: &mut W, reply: &[u8]) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    writer.write(reply).await?;
    writer.flush().await
}`;

const writeReplySolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt};

pub async fn write_reply<W>(writer: &mut W, reply: &[u8]) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    writer.write_all(reply).await?;
    writer.flush().await
}`;

const writeReplyTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncReadExt, AsyncWrite};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}

struct FlushProbe {
    bytes: Vec<u8>,
    flushes: usize,
    pending_flush: bool,
    write_error: Option<io::Error>,
    flush_error: Option<io::Error>,
}
impl AsyncWrite for FlushProbe {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        match self.write_error.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => {
                self.bytes.extend_from_slice(input);
                Poll::Ready(Ok(input.len()))
            }
        }
    }
    fn poll_flush(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        self.flushes += 1;
        if let Some(error) = self.flush_error.take() {
            return Poll::Ready(Err(error));
        }
        if self.pending_flush {
            self.pending_flush = false;
            context.waker().wake_by_ref();
            return Poll::Pending;
        }
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread")]
async fn writes_every_byte_after_real_duplex_backpressure() {
    let (mut writer, mut peer) = io::duplex(2);
    let mut sending = Box::pin(write_reply(&mut writer, b"rust"));

    assert!(poll_once(sending.as_mut()).is_pending());
    let mut first = [0; 2];
    assert_eq!(peer.read(&mut first).await.unwrap(), 2);
    assert_eq!(&first, b"ru");
    assert!(matches!(poll_once(sending.as_mut()), Poll::Ready(Ok(()))));
    let mut last = [0; 2];
    assert_eq!(peer.read(&mut last).await.unwrap(), 2);
    assert_eq!(&last, b"st");
}

#[tokio::test(flavor = "current_thread")]
async fn flushes_an_empty_reply_even_when_flush_first_returns_pending() {
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        write_error: None,
        flush_error: None,
    };
    write_reply(&mut writer, b"").await.unwrap();
    assert_eq!(writer.bytes, b"");
    assert_eq!(writer.flushes, 2);
}

#[tokio::test(flavor = "current_thread")]
async fn flushes_a_nonempty_reply_even_when_flush_first_returns_pending() {
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        write_error: None,
        flush_error: None,
    };
    write_reply(&mut writer, b"ok").await.unwrap();
    assert_eq!(writer.bytes, b"ok");
    assert_eq!(writer.flushes, 2);
}

#[tokio::test(flavor = "current_thread")]
async fn returns_original_non_copy_errors_from_write_and_flush() {
    let mut write_failing = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        write_error: Some(io::Error::new(io::ErrorKind::Other, Marker("write marker"))),
        flush_error: None,
    };
    let error = write_reply(&mut write_failing, b"x").await.unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("write marker"));

    let mut flush_failing = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        write_error: None,
        flush_error: Some(io::Error::new(io::ErrorKind::Other, Marker("flush marker"))),
    };
    let error = write_reply(&mut flush_failing, b"ok").await.unwrap_err();
    assert_eq!(flush_failing.bytes, b"ok");
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("flush marker"));
}`;

const transferPrefixSolution = `use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub async fn transfer_prefix<R, W>(
    reader: &mut R,
    writer: &mut W,
    limit: u64,
) -> io::Result<u64>
where
    R: AsyncRead + Unpin,
    W: AsyncWrite + Unpin,
{
    let mut moved = 0;
    let mut buffer = [0; 64];

    while moved < limit {
        let width = (limit - moved).min(buffer.len() as u64) as usize;
        let read = reader.read(&mut buffer[..width]).await?;
        if read == 0 {
            break;
        }
        writer.write_all(&buffer[..read]).await?;
        moved += read as u64;
    }

    writer.flush().await?;
    Ok(moved)
}`;

const transferPrefixTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, ReadBuf};

struct Chunked<S> {
    inner: S,
    maximum: usize,
}
impl<S: AsyncRead + Unpin> AsyncRead for Chunked<S> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        let width = self.maximum.min(output.remaining()).min(64);
        let mut scratch = [0; 64];
        let mut limited = ReadBuf::new(&mut scratch[..width]);
        match Pin::new(&mut self.inner).poll_read(context, &mut limited) {
            Poll::Ready(Ok(())) => {
                output.put_slice(limited.filled());
                Poll::Ready(Ok(()))
            }
            Poll::Ready(Err(error)) => Poll::Ready(Err(error)),
            Poll::Pending => Poll::Pending,
        }
    }
}
impl<S: AsyncWrite + Unpin> AsyncWrite for Chunked<S> {
    fn poll_write(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        let width = self.maximum.min(input.len());
        Pin::new(&mut self.inner).poll_write(context, &input[..width])
    }
    fn poll_flush(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<io::Result<()>> {
        Pin::new(&mut self.inner).poll_flush(context)
    }
    fn poll_shutdown(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<io::Result<()>> {
        Pin::new(&mut self.inner).poll_shutdown(context)
    }
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}

struct ErrorReader(Option<io::Error>);
impl AsyncRead for ErrorReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("reader was polled after its error"),
        }
    }
}

struct FlushProbe {
    bytes: Vec<u8>,
    flushes: usize,
    pending_flush: bool,
    flush_error: Option<io::Error>,
}
impl AsyncWrite for FlushProbe {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        self.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        self.flushes += 1;
        if let Some(error) = self.flush_error.take() {
            return Poll::Ready(Err(error));
        }
        if self.pending_flush {
            self.pending_flush = false;
            context.waker().wake_by_ref();
            return Poll::Pending;
        }
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread")]
async fn forwards_only_the_limit_through_real_short_duplex_io() {
    let (mut input_writer, input_reader) = io::duplex(8);
    input_writer.write_all(b"rust").await.unwrap();
    input_writer.shutdown().await.unwrap();
    let (output_writer, mut output_reader) = io::duplex(8);
    let mut input = Chunked { inner: input_reader, maximum: 1 };
    let mut output = Chunked { inner: output_writer, maximum: 1 };

    assert_eq!(transfer_prefix(&mut input, &mut output, 3).await.unwrap(), 3);
    let mut forwarded = [0; 3];
    assert_eq!(output_reader.read(&mut forwarded).await.unwrap(), 3);
    assert_eq!(&forwarded, b"rus");
    let mut remainder = [0; 1];
    assert_eq!(input.read(&mut remainder).await.unwrap(), 1);
    assert_eq!(&remainder, b"t");
}

#[tokio::test(flavor = "current_thread")]
async fn zero_limit_and_clean_eof_move_no_bytes() {
    let (mut input_writer, mut input_reader) = io::duplex(8);
    input_writer.write_all(b"x").await.unwrap();
    input_writer.shutdown().await.unwrap();
    let (mut output_writer, _) = io::duplex(8);
    assert_eq!(transfer_prefix(&mut input_reader, &mut output_writer, 0).await.unwrap(), 0);
    let mut still_there = [0; 1];
    assert_eq!(input_reader.read(&mut still_there).await.unwrap(), 1);
    assert_eq!(&still_there, b"x");

    let (mut input_writer, mut input_reader) = io::duplex(8);
    input_writer.shutdown().await.unwrap();
    assert_eq!(transfer_prefix(&mut input_reader, &mut output_writer, 9).await.unwrap(), 0);
}

#[tokio::test(flavor = "current_thread")]
async fn keeps_a_non_copy_input_error_intact() {
    let mut input = ErrorReader(Some(io::Error::new(io::ErrorKind::Other, Marker("read marker"))));
    let (mut output, _) = io::duplex(8);

    let error = transfer_prefix(&mut input, &mut output, 1).await.unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("read marker"));
}

#[tokio::test(flavor = "current_thread")]
async fn flushes_empty_transfer_and_returns_a_flush_error() {
    let (mut input_writer, mut input_reader) = io::duplex(8);
    input_writer.shutdown().await.unwrap();
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    assert_eq!(transfer_prefix(&mut input_reader, &mut writer, 0).await.unwrap(), 0);
    assert_eq!(writer.bytes, b"");
    assert_eq!(writer.flushes, 2);

    let (mut input_writer, mut input_reader) = io::duplex(8);
    input_writer.write_all(b"ok").await.unwrap();
    input_writer.shutdown().await.unwrap();
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    assert_eq!(transfer_prefix(&mut input_reader, &mut writer, 2).await.unwrap(), 2);
    assert_eq!(writer.bytes, b"ok");
    assert_eq!(writer.flushes, 2);

    let (mut input_writer, mut input_reader) = io::duplex(8);
    input_writer.write_all(b"ok").await.unwrap();
    input_writer.shutdown().await.unwrap();
    let mut failing = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        flush_error: Some(io::Error::new(io::ErrorKind::Other, Marker("transfer flush marker"))),
    };
    let error = transfer_prefix(&mut input_reader, &mut failing, 2)
        .await
        .unwrap_err();
    assert_eq!(failing.bytes, b"ok");
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("transfer flush marker"));
}`;

const sendAndCloseSolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt};

pub async fn send_and_close<W>(writer: &mut W, reply: &[u8]) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    writer.write_all(reply).await?;
    writer.shutdown().await
}`;

const sendAndCloseTests = `use tokio::io::{self, AsyncReadExt};

#[tokio::test(flavor = "current_thread")]
async fn capacity_two_requires_concurrent_drain_before_peer_observes_eof() {
    let (mut writer, mut reader) = io::duplex(2);
    let send = send_and_close(&mut writer, b"bye");
    let receive = async {
        let mut bytes = Vec::new();
        let mut buffer = [0; 2];
        loop {
            let read = reader.read(&mut buffer).await.unwrap();
            if read == 0 {
                break bytes;
            }
            bytes.extend_from_slice(&buffer[..read]);
        }
    };
    let (sent, bytes) = tokio::join!(send, receive);
    sent.unwrap();
    assert_eq!(bytes, b"bye");
}

#[tokio::test(flavor = "current_thread")]
async fn empty_reply_still_closes_the_write_half() {
    let (mut writer, mut reader) = io::duplex(4);
    send_and_close(&mut writer, b"").await.unwrap();
    let mut byte = [0; 1];
    assert_eq!(reader.read(&mut byte).await.unwrap(), 0);
}`;

const framedReadRun = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let (mut writer, mut reader) = io::duplex(8);
            writer.write_all(&[0, 3, b'c', b'a', b't']).await.unwrap();
            writer.shutdown().await.unwrap();
            let mut header = [0; 2];
            reader.read(&mut header).await.unwrap();
            let mut body = [0; 3];
            reader.read(&mut body).await.unwrap();
            println!("length={}", u16::from_be_bytes(header));
            println!("body={}", String::from_utf8_lossy(&body));
        });
}`;

const retainedProgressRun = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let (mut writer, mut reader) = io::duplex(8);
            writer.write_all(&[0, 3, b'c']).await.unwrap();
            let mut header = [0; 2];
            let mut prefix = [0; 1];
            reader.read(&mut header).await.unwrap();
            reader.read(&mut prefix).await.unwrap();
            println!("length={}", u16::from_be_bytes(header));
            println!("body-prefix={}", String::from_utf8_lossy(&prefix));
        });
}`;

const readFrameStarter = `use tokio::io::{self, AsyncRead, AsyncReadExt};

pub async fn read_one_frame<R>(reader: &mut R, limit: usize) -> io::Result<Option<Vec<u8>>>
where
    R: AsyncRead + Unpin,
{
    let _ = (reader, limit);
    Ok(None)
}`;

const readFrameSolution = `use tokio::io::{self, AsyncRead, AsyncReadExt, ErrorKind};

pub async fn read_one_frame<R>(reader: &mut R, limit: usize) -> io::Result<Option<Vec<u8>>>
where
    R: AsyncRead + Unpin,
{
    let mut header = [0; 2];
    let mut header_used = 0;
    while header_used < header.len() {
        let read = reader.read(&mut header[header_used..]).await?;
        if read == 0 {
            return if header_used == 0 {
                Ok(None)
            } else {
                Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame header"))
            };
        }
        header_used += read;
    }

    let length = u16::from_be_bytes(header) as usize;
    if length > limit {
        return Err(io::Error::new(ErrorKind::InvalidData, "frame exceeds limit"));
    }
    let mut body = vec![0; length];
    let mut body_used = 0;
    while body_used < body.len() {
        let read = reader.read(&mut body[body_used..]).await?;
        if read == 0 {
            return Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame body"));
        }
        body_used += read;
    }
    Ok(Some(body))
}`;

const readFrameTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{self, AsyncRead, AsyncWriteExt, ReadBuf};

struct Chunked<S> {
    inner: S,
}
impl<S: AsyncRead + Unpin> AsyncRead for Chunked<S> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        let mut byte = [0; 1];
        let mut limited = ReadBuf::new(&mut byte);
        match Pin::new(&mut self.inner).poll_read(context, &mut limited) {
            Poll::Ready(Ok(())) => {
                output.put_slice(limited.filled());
                Poll::Ready(Ok(()))
            }
            Poll::Ready(Err(error)) => Poll::Ready(Err(error)),
            Poll::Pending => Poll::Pending,
        }
    }
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}
struct ErrorReader(Option<io::Error>);
impl AsyncRead for ErrorReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("reader was polled after its error"),
        }
    }
}

#[tokio::test(flavor = "current_thread")]
async fn decodes_empty_then_nonempty_frames_across_real_one_byte_duplex_reads() {
    let (mut writer, reader) = io::duplex(16);
    writer
        .write_all(&[0, 0, 0, 3, b'c', b'a', b't'])
        .await
        .unwrap();
    writer.shutdown().await.unwrap();
    let mut reader = Chunked { inner: reader };

    assert_eq!(read_one_frame(&mut reader, 8).await.unwrap(), Some(Vec::new()));
    assert_eq!(read_one_frame(&mut reader, 8).await.unwrap(), Some(b"cat".to_vec()));
    assert_eq!(read_one_frame(&mut reader, 8).await.unwrap(), None);
}

#[tokio::test(flavor = "current_thread")]
async fn distinguishes_clean_eof_from_a_truncated_header_and_body() {
    let (mut writer, mut reader) = io::duplex(8);
    writer.shutdown().await.unwrap();
    assert_eq!(read_one_frame(&mut reader, 8).await.unwrap(), None);

    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(&[0]).await.unwrap();
    writer.shutdown().await.unwrap();
    let error = read_one_frame(&mut reader, 8).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::UnexpectedEof);
    assert_eq!(error.to_string(), "truncated frame header");

    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(&[0, 3, b'c', b'a']).await.unwrap();
    writer.shutdown().await.unwrap();
    let error = read_one_frame(&mut reader, 8).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::UnexpectedEof);
    assert_eq!(error.to_string(), "truncated frame body");
}

#[tokio::test(flavor = "current_thread")]
async fn rejects_oversize_before_consuming_or_allocating_the_body() {
    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(&[0, 3, b'c', b'a', b't']).await.unwrap();
    writer.shutdown().await.unwrap();

    let error = read_one_frame(&mut reader, 2).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    let mut untouched_body = [0; 3];
    assert_eq!(reader.read(&mut untouched_body).await.unwrap(), 3);
    assert_eq!(&untouched_body, b"cat");
}

#[tokio::test(flavor = "current_thread")]
async fn propagates_a_non_copy_reader_error_without_replacing_it() {
    let mut reader = ErrorReader(Some(io::Error::new(io::ErrorKind::Other, Marker("frame marker"))));
    let error = read_one_frame(&mut reader, 8).await.unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("frame marker"));
}`;

const writeFrameSolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt, ErrorKind};

pub async fn write_one_frame<W>(writer: &mut W, body: &[u8], limit: usize) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    if body.len() > limit || body.len() > u16::MAX as usize {
        return Err(io::Error::new(ErrorKind::InvalidInput, "frame exceeds limit"));
    }
    writer.write_all(&(body.len() as u16).to_be_bytes()).await?;
    writer.write_all(body).await?;
    writer.flush().await
}`;

const writeFrameTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncReadExt, AsyncWrite};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}
struct ErrorWriter(Option<io::Error>);
impl AsyncWrite for ErrorWriter {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &[u8],
    ) -> Poll<io::Result<usize>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("writer was polled after its error"),
        }
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

struct FlushProbe {
    bytes: Vec<u8>,
    flushes: usize,
    pending_flush: bool,
    flush_error: Option<io::Error>,
}
impl AsyncWrite for FlushProbe {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        self.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        self.flushes += 1;
        if let Some(error) = self.flush_error.take() {
            return Poll::Ready(Err(error));
        }
        if self.pending_flush {
            self.pending_flush = false;
            context.waker().wake_by_ref();
            return Poll::Pending;
        }
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread")]
async fn emits_the_big_endian_prefix_and_body_through_short_duplex_writes() {
    let (mut writer, mut peer) = io::duplex(2);
    let mut sending = Box::pin(write_one_frame(&mut writer, b"cat", 3));

    assert!(poll_once(sending.as_mut()).is_pending());
    let mut header = [0; 2];
    assert_eq!(peer.read(&mut header).await.unwrap(), 2);
    assert_eq!(&header, &[0, 3]);
    assert!(poll_once(sending.as_mut()).is_pending());
    let mut middle = [0; 2];
    assert_eq!(peer.read(&mut middle).await.unwrap(), 2);
    assert_eq!(&middle, b"ca");
    assert!(matches!(poll_once(sending.as_mut()), Poll::Ready(Ok(()))));
    let mut last = [0; 1];
    assert_eq!(peer.read(&mut last).await.unwrap(), 1);
    assert_eq!(&last, b"t");
}

#[tokio::test(flavor = "current_thread")]
async fn rejects_before_emitting_and_handles_an_empty_body() {
    let (mut writer, mut peer) = io::duplex(16);
    let error = write_one_frame(&mut writer, b"four", 2).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    write_one_frame(&mut writer, b"ok", 2).await.unwrap();
    let mut valid = [0; 4];
    assert_eq!(peer.read(&mut valid).await.unwrap(), 4);
    assert_eq!(&valid, &[0, 2, b'o', b'k']);

    let (mut writer, mut peer) = io::duplex(8);
    write_one_frame(&mut writer, b"", 0).await.unwrap();
    let mut header = [9; 2];
    assert_eq!(peer.read(&mut header).await.unwrap(), 2);
    assert_eq!(&header, &[0, 0]);
}

#[tokio::test(flavor = "current_thread")]
async fn returns_a_non_copy_writer_error() {
    let mut writer = ErrorWriter(Some(io::Error::new(io::ErrorKind::Other, Marker("encode marker"))));
    let error = write_one_frame(&mut writer, b"x", 1).await.unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("encode marker"));
}

#[tokio::test(flavor = "current_thread")]
async fn empty_frame_waits_for_flush_and_propagates_its_error() {
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    write_one_frame(&mut writer, b"", 0).await.unwrap();
    assert_eq!(writer.bytes, &[0, 0]);
    assert_eq!(writer.flushes, 2);
}

#[tokio::test(flavor = "current_thread")]
async fn nonempty_frame_waits_for_flush_and_propagates_its_error() {
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    write_one_frame(&mut writer, b"ok", 2).await.unwrap();
    assert_eq!(writer.bytes, &[0, 2, b'o', b'k']);
    assert_eq!(writer.flushes, 2);

    let mut failing = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        flush_error: Some(io::Error::new(io::ErrorKind::Other, Marker("frame flush marker"))),
    };
    let error = write_one_frame(&mut failing, b"ok", 2).await.unwrap_err();
    assert_eq!(failing.bytes, &[0, 2, b'o', b'k']);
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("frame flush marker"));
}

#[tokio::test(flavor = "current_thread")]
async fn accepts_u16_maximum_and_rejects_the_next_length_before_writing() {
    let largest = vec![b'x'; u16::MAX as usize];
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        flush_error: None,
    };
    write_one_frame(&mut writer, &largest, u16::MAX as usize)
        .await
        .unwrap();
    assert_eq!(writer.bytes.len(), u16::MAX as usize + 2);
    assert_eq!(&writer.bytes[..2], &[255, 255]);
    assert_eq!(&writer.bytes[2..], largest);

    let too_large = vec![b'y'; u16::MAX as usize + 1];
    let mut rejected = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        flush_error: None,
    };
    let error = write_one_frame(&mut rejected, &too_large, u16::MAX as usize + 1)
        .await
        .unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    assert!(rejected.bytes.is_empty());
}`;

const writeFrameBatchSolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt, ErrorKind};

pub async fn write_frame_batch<W>(
    writer: &mut W,
    frames: &[&[u8]],
    limit: usize,
) -> io::Result<usize>
where
    W: AsyncWrite + Unpin,
{
    for frame in frames {
        if frame.len() > limit || frame.len() > u16::MAX as usize {
            return Err(io::Error::new(ErrorKind::InvalidInput, "frame exceeds limit"));
        }
    }
    for frame in frames {
        writer.write_all(&(frame.len() as u16).to_be_bytes()).await?;
        writer.write_all(frame).await?;
    }
    writer.flush().await?;
    Ok(frames.len())
}`;

const writeFrameBatchTests = `use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncReadExt, AsyncWrite};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

struct FlushProbe {
    bytes: Vec<u8>,
    flushes: usize,
    pending_flush: bool,
    flush_error: Option<io::Error>,
}
impl AsyncWrite for FlushProbe {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        self.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(mut self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<io::Result<()>> {
        self.flushes += 1;
        if let Some(error) = self.flush_error.take() {
            return Poll::Ready(Err(error));
        }
        if self.pending_flush {
            self.pending_flush = false;
            context.waker().wake_by_ref();
            return Poll::Pending;
        }
        Poll::Ready(Ok(()))
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread")]
async fn capacity_two_short_writes_need_concurrent_drain_and_preserve_frame_order() {
    let (mut writer, mut reader) = io::duplex(2);
    let send = write_frame_batch(&mut writer, &[b"a", b"bc"], 3);
    let receive = async {
        let mut bytes = Vec::new();
        let mut chunk = [0; 2];
        while bytes.len() < 7 {
            let read = reader.read(&mut chunk).await.unwrap();
            assert_ne!(read, 0);
            bytes.extend_from_slice(&chunk[..read]);
        }
        bytes
    };
    let (written, bytes) = tokio::join!(send, receive);
    assert_eq!(written.unwrap(), 2);
    assert_eq!(&bytes, &[0, 1, b'a', 0, 2, b'b', b'c']);
}

#[tokio::test(flavor = "current_thread")]
async fn validates_the_whole_batch_before_the_first_prefix() {
    let (mut writer, mut reader) = io::duplex(8);
    let error = write_frame_batch(&mut writer, &[b"ok", b"toolong"], 2)
        .await
        .unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    let mut probe = [0; 1];
    let mut waiting = Box::pin(reader.read(&mut probe));
    assert!(poll_once(waiting.as_mut()).is_pending());
    drop(waiting);

    write_frame_batch(&mut writer, &[b"x"], 2).await.unwrap();
    assert_eq!(reader.read(&mut probe).await.unwrap(), 1);
    assert_eq!(probe, [0]);
    let mut rest = [0; 2];
    assert_eq!(reader.read(&mut rest).await.unwrap(), 2);
    assert_eq!(&rest, &[1, b'x']);
}

#[tokio::test(flavor = "current_thread")]
async fn empty_batch_waits_for_flush_and_reports_its_error() {
    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    assert_eq!(write_frame_batch(&mut writer, &[], 0).await.unwrap(), 0);
    assert_eq!(writer.flushes, 2);

    let mut writer = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: true,
        flush_error: None,
    };
    assert_eq!(write_frame_batch(&mut writer, &[b"ok"], 2).await.unwrap(), 1);
    assert_eq!(writer.bytes, &[0, 2, b'o', b'k']);
    assert_eq!(writer.flushes, 2);

    let mut failing = FlushProbe {
        bytes: Vec::new(),
        flushes: 0,
        pending_flush: false,
        flush_error: Some(io::Error::new(io::ErrorKind::Other, "batch flush marker")),
    };
    let error = write_frame_batch(&mut failing, &[b"ok"], 2).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::Other);
    assert_eq!(failing.bytes, &[0, 2, b'o', b'k']);
}`;

const frameStateStarter = `use tokio::io::{self, AsyncRead};

pub struct FrameState {
    limit: usize,
    header: [u8; 2],
    header_used: usize,
    expected: Option<usize>,
    body: Vec<u8>,
}

impl FrameState {
    pub fn new(limit: usize) -> Self {
        Self {
            limit,
            header: [0; 2],
            header_used: 0,
            expected: None,
            body: Vec::new(),
        }
    }
    pub fn header_bytes_read(&self) -> usize { self.header_used }
    pub fn body_bytes_read(&self) -> usize { self.body.len() }
}

pub async fn continue_frame<R>(
    state: &mut FrameState,
    reader: &mut R,
) -> io::Result<Option<Vec<u8>>>
where
    R: AsyncRead + Unpin,
{
    let _ = (state, reader);
    Ok(None)
}`;

const frameStateSolution = `use tokio::io::{self, AsyncRead, AsyncReadExt, ErrorKind};

pub struct FrameState {
    limit: usize,
    header: [u8; 2],
    header_used: usize,
    expected: Option<usize>,
    body: Vec<u8>,
}

impl FrameState {
    pub fn new(limit: usize) -> Self {
        Self {
            limit,
            header: [0; 2],
            header_used: 0,
            expected: None,
            body: Vec::new(),
        }
    }

    pub fn header_bytes_read(&self) -> usize {
        self.header_used
    }

    pub fn body_bytes_read(&self) -> usize {
        self.body.len()
    }

    fn reset_for_next_frame(&mut self) {
        self.header = [0; 2];
        self.header_used = 0;
        self.expected = None;
        self.body = Vec::new();
    }
}

pub async fn continue_frame<R>(
    state: &mut FrameState,
    reader: &mut R,
) -> io::Result<Option<Vec<u8>>>
where
    R: AsyncRead + Unpin,
{
    while state.header_used < state.header.len() {
        let used = state.header_used;
        let read = reader.read(&mut state.header[used..]).await?;
        if read == 0 {
            return if used == 0 {
                Ok(None)
            } else {
                Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame header"))
            };
        }
        state.header_used += read;
    }

    if state.expected.is_none() {
        let expected = u16::from_be_bytes(state.header) as usize;
        if expected > state.limit {
            return Err(io::Error::new(ErrorKind::InvalidData, "frame exceeds limit"));
        }
        state.expected = Some(expected);
        state.body = Vec::with_capacity(expected);
    }

    let expected = state.expected.unwrap();
    while state.body.len() < expected {
        let mut chunk = [0; 64];
        let width = (expected - state.body.len()).min(chunk.len());
        let read = reader.read(&mut chunk[..width]).await?;
        if read == 0 {
            return Err(io::Error::new(ErrorKind::UnexpectedEof, "truncated frame body"));
        }
        state.body.extend_from_slice(&chunk[..read]);
    }

    let frame = std::mem::take(&mut state.body);
    state.reset_for_next_frame();
    Ok(Some(frame))
}`;

const frameStateTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWriteExt, ReadBuf};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

struct OneByte<S> {
    inner: S,
}
impl<S: AsyncRead + Unpin> AsyncRead for OneByte<S> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        let mut byte = [0; 1];
        let mut limited = ReadBuf::new(&mut byte);
        match Pin::new(&mut self.inner).poll_read(context, &mut limited) {
            Poll::Ready(Ok(())) => {
                output.put_slice(limited.filled());
                Poll::Ready(Ok(()))
            }
            Poll::Ready(Err(error)) => Poll::Ready(Err(error)),
            Poll::Pending => Poll::Pending,
        }
    }
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}
struct ErrorReader(Option<io::Error>);
impl AsyncRead for ErrorReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("reader was polled after its error"),
        }
    }
}

#[tokio::test(flavor = "current_thread")]
async fn cancelled_call_keeps_header_and_body_progress_for_a_retry() {
    let (mut writer, reader) = io::duplex(8);
    writer.write_all(&[0, 3, b'c']).await.unwrap();
    let mut reader = OneByte { inner: reader };
    let mut state = FrameState::new(8);
    let mut first_attempt = Box::pin(continue_frame(&mut state, &mut reader));

    assert!(poll_once(first_attempt.as_mut()).is_pending());
    drop(first_attempt);
    assert_eq!(state.header_bytes_read(), 2);
    assert_eq!(state.body_bytes_read(), 1);

    writer.write_all(b"at").await.unwrap();
    assert_eq!(continue_frame(&mut state, &mut reader).await.unwrap(), Some(b"cat".to_vec()));
    assert_eq!(state.header_bytes_read(), 0);
    assert_eq!(state.body_bytes_read(), 0);

    writer.write_all(&[0, 1, b'x']).await.unwrap();
    writer.shutdown().await.unwrap();
    assert_eq!(continue_frame(&mut state, &mut reader).await.unwrap(), Some(b"x".to_vec()));
}

#[tokio::test(flavor = "current_thread")]
async fn cancelled_call_after_one_header_byte_keeps_that_byte() {
    let (mut writer, reader) = io::duplex(8);
    writer.write_all(&[0]).await.unwrap();
    let mut reader = OneByte { inner: reader };
    let mut state = FrameState::new(8);
    let mut first_attempt = Box::pin(continue_frame(&mut state, &mut reader));

    assert!(poll_once(first_attempt.as_mut()).is_pending());
    drop(first_attempt);
    assert_eq!(state.header_bytes_read(), 1);
    assert_eq!(state.body_bytes_read(), 0);

    writer.write_all(&[3, b'c', b'a', b't']).await.unwrap();
    assert_eq!(continue_frame(&mut state, &mut reader).await.unwrap(), Some(b"cat".to_vec()));
}

#[tokio::test(flavor = "current_thread")]
async fn clean_eof_truncated_body_and_oversize_have_different_results() {
    let (mut writer, mut reader) = io::duplex(8);
    writer.shutdown().await.unwrap();
    assert_eq!(continue_frame(&mut FrameState::new(8), &mut reader).await.unwrap(), None);

    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(&[0, 3, b'c']).await.unwrap();
    writer.shutdown().await.unwrap();
    let mut state = FrameState::new(8);
    let error = continue_frame(&mut state, &mut reader).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::UnexpectedEof);
    assert_eq!(state.body_bytes_read(), 1);

    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(&[0, 3, b'c', b'a', b't']).await.unwrap();
    writer.shutdown().await.unwrap();
    let mut state = FrameState::new(2);
    let error = continue_frame(&mut state, &mut reader).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    let mut untouched = [0; 3];
    assert_eq!(reader.read(&mut untouched).await.unwrap(), 3);
    assert_eq!(&untouched, b"cat");
}

#[tokio::test(flavor = "current_thread")]
async fn preserves_a_non_copy_read_error() {
    let mut reader = ErrorReader(Some(io::Error::new(io::ErrorKind::Other, Marker("resume marker"))));
    let error = continue_frame(&mut FrameState::new(8), &mut reader)
        .await
        .unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("resume marker"));
}`;

const pendingWriteSolution = `use tokio::io::{self, AsyncWrite, AsyncWriteExt, ErrorKind};

#[derive(Debug)]
pub enum PendingWriteError {
    TooLarge { body: Vec<u8>, limit: usize },
}

pub struct PendingWrite {
    bytes: Vec<u8>,
    offset: usize,
}

impl PendingWrite {
    pub fn new(body: Vec<u8>, limit: usize) -> Result<Self, PendingWriteError> {
        let length = body.len();
        if length > limit || length > u16::MAX as usize {
            return Err(PendingWriteError::TooLarge { body, limit });
        }
        let mut bytes = Vec::with_capacity(length + 2);
        bytes.extend_from_slice(&(length as u16).to_be_bytes());
        bytes.extend_from_slice(&body);
        Ok(Self { bytes, offset: 0 })
    }

    pub fn written(&self) -> usize {
        self.offset
    }

    pub fn is_complete(&self) -> bool {
        self.offset == self.bytes.len()
    }
}

pub async fn continue_write<W>(state: &mut PendingWrite, writer: &mut W) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    while state.offset < state.bytes.len() {
        let written = writer.write(&state.bytes[state.offset..]).await?;
        if written == 0 {
            return Err(io::Error::new(ErrorKind::WriteZero, "writer accepted no bytes"));
        }
        state.offset += written;
    }
    writer.flush().await
}`;

const pendingWriteTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncReadExt, AsyncWrite};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}

#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}
struct ErrorWriter(Option<io::Error>);
impl AsyncWrite for ErrorWriter {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &[u8],
    ) -> Poll<io::Result<usize>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("writer was polled after its error"),
        }
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
struct ZeroWriter;
impl AsyncWrite for ZeroWriter {
    fn poll_write(
        self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &[u8],
    ) -> Poll<io::Result<usize>> {
        let _ = self;
        Poll::Ready(Ok(0))
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

struct PauseFlushWriter {
    bytes: Vec<u8>,
    flushes: usize,
    allow_flush: bool,
    flush_error: Option<io::Error>,
}
impl AsyncWrite for PauseFlushWriter {
    fn poll_write(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        input: &[u8],
    ) -> Poll<io::Result<usize>> {
        self.bytes.extend_from_slice(input);
        Poll::Ready(Ok(input.len()))
    }
    fn poll_flush(mut self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        self.flushes += 1;
        if let Some(error) = self.flush_error.take() {
            return Poll::Ready(Err(error));
        }
        if self.allow_flush {
            Poll::Ready(Ok(()))
        } else {
            Poll::Pending
        }
    }
    fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
        let _ = self;
        Poll::Ready(Ok(()))
    }
}

#[tokio::test(flavor = "current_thread")]
async fn cancel_then_retry_keeps_the_offset_and_never_duplicates_a_prefix() {
    let (mut writer, mut peer) = io::duplex(2);
    let mut state = PendingWrite::new(b"cat".to_vec(), 3).unwrap();
    let mut first_attempt = Box::pin(continue_write(&mut state, &mut writer));
    assert!(poll_once(first_attempt.as_mut()).is_pending());
    drop(first_attempt);
    assert_eq!(state.written(), 2);

    let mut header = [0; 2];
    assert_eq!(peer.read(&mut header).await.unwrap(), 2);
    assert_eq!(&header, &[0, 3]);
    let mut retry = Box::pin(continue_write(&mut state, &mut writer));
    assert!(poll_once(retry.as_mut()).is_pending());
    drop(retry);
    assert_eq!(state.written(), 4);
    let mut middle = [0; 2];
    assert_eq!(peer.read(&mut middle).await.unwrap(), 2);
    assert_eq!(&middle, b"ca");
    continue_write(&mut state, &mut writer).await.unwrap();
    let mut last = [0; 1];
    assert_eq!(peer.read(&mut last).await.unwrap(), 1);
    assert_eq!(&last, b"t");
    assert!(state.is_complete());
}

#[tokio::test(flavor = "current_thread")]
async fn retry_after_pending_flush_does_not_rewrite_completed_bytes() {
    let mut state = PendingWrite::new(b"cat".to_vec(), 3).unwrap();
    let mut writer = PauseFlushWriter {
        bytes: Vec::new(),
        flushes: 0,
        allow_flush: false,
        flush_error: None,
    };
    let mut first_attempt = Box::pin(continue_write(&mut state, &mut writer));
    assert!(poll_once(first_attempt.as_mut()).is_pending());
    drop(first_attempt);
    assert!(state.is_complete());
    assert_eq!(writer.bytes, &[0, 3, b'c', b'a', b't']);
    assert_eq!(writer.flushes, 1);

    writer.allow_flush = true;
    continue_write(&mut state, &mut writer).await.unwrap();
    assert_eq!(writer.bytes, &[0, 3, b'c', b'a', b't']);
    assert_eq!(writer.flushes, 2);
}

#[tokio::test(flavor = "current_thread")]
async fn constructor_handles_empty_high_byte_and_u16_limit_separately_from_policy_limit() {
    let mut empty = PendingWrite::new(Vec::new(), 0).unwrap();
    let mut empty_writer = PauseFlushWriter {
        bytes: Vec::new(),
        flushes: 0,
        allow_flush: true,
        flush_error: None,
    };
    continue_write(&mut empty, &mut empty_writer).await.unwrap();
    assert_eq!(empty_writer.bytes, &[0, 0]);

    let mut high_byte = PendingWrite::new(vec![b'x'; 256], 256).unwrap();
    let mut high_byte_writer = PauseFlushWriter {
        bytes: Vec::new(),
        flushes: 0,
        allow_flush: true,
        flush_error: None,
    };
    continue_write(&mut high_byte, &mut high_byte_writer).await.unwrap();
    let mut expected = vec![1, 0];
    expected.extend_from_slice(&vec![b'x'; 256]);
    assert_eq!(high_byte_writer.bytes, expected);

    let mut largest = PendingWrite::new(vec![b'y'; u16::MAX as usize], u16::MAX as usize)
        .unwrap();
    let mut largest_writer = PauseFlushWriter {
        bytes: Vec::new(),
        flushes: 0,
        allow_flush: true,
        flush_error: None,
    };
    continue_write(&mut largest, &mut largest_writer).await.unwrap();
    assert!(largest.is_complete());
    assert_eq!(largest_writer.bytes.len(), u16::MAX as usize + 2);
    assert_eq!(&largest_writer.bytes[..2], &[255, 255]);

    let oversized = vec![b'z'; u16::MAX as usize + 1];
    match PendingWrite::new(oversized, u16::MAX as usize + 1) {
        Err(PendingWriteError::TooLarge { body, limit }) => {
            assert_eq!(body.len(), u16::MAX as usize + 1);
            assert_eq!(limit, u16::MAX as usize + 1);
        }
        Ok(_) => panic!("u16 overflow unexpectedly accepted"),
    }
}

#[tokio::test(flavor = "current_thread")]
async fn preserves_owned_body_on_validation_and_keeps_non_copy_write_errors() {
    match PendingWrite::new(b"cat".to_vec(), 2) {
        Err(PendingWriteError::TooLarge { body, limit }) => {
            assert_eq!(body, b"cat");
            assert_eq!(limit, 2);
        }
        Ok(_) => panic!("oversize body unexpectedly accepted"),
    }

    let mut state = PendingWrite::new(b"x".to_vec(), 1).unwrap();
    let mut writer = ErrorWriter(Some(io::Error::new(io::ErrorKind::Other, Marker("write state marker"))));
    let error = continue_write(&mut state, &mut writer).await.unwrap_err();
    assert_eq!(state.written(), 0);
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("write state marker"));

    let mut zero = ZeroWriter;
    let error = continue_write(&mut state, &mut zero).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::WriteZero);
    assert_eq!(state.written(), 0);

    let mut state = PendingWrite::new(b"x".to_vec(), 1).unwrap();
    let mut writer = PauseFlushWriter {
        bytes: Vec::new(),
        flushes: 0,
        allow_flush: true,
        flush_error: Some(io::Error::new(io::ErrorKind::Other, Marker("pending flush marker"))),
    };
    let error = continue_write(&mut state, &mut writer).await.unwrap_err();
    assert!(state.is_complete());
    assert_eq!(writer.bytes, &[0, 1, b'x']);
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("pending flush marker"));
}`;

const continueCollectSolution = `use tokio::io::{self, AsyncRead, AsyncReadExt, ErrorKind};

pub async fn continue_collect<R>(
    reader: &mut R,
    saved: &mut Vec<u8>,
    limit: usize,
) -> io::Result<()>
where
    R: AsyncRead + Unpin,
{
    if saved.len() > limit {
        return Err(io::Error::new(ErrorKind::InvalidData, "saved bytes exceed limit"));
    }

    loop {
        if saved.len() == limit {
            let mut extra = [0; 1];
            return match reader.read(&mut extra).await? {
                0 => Ok(()),
                _ => Err(io::Error::new(ErrorKind::InvalidData, "collection exceeds limit")),
            };
        }

        let mut chunk = [0; 64];
        let width = (limit - saved.len()).min(chunk.len());
        let read = reader.read(&mut chunk[..width]).await?;
        if read == 0 {
            return Ok(());
        }
        saved.extend_from_slice(&chunk[..read]);
    }
}`;

const continueCollectTests = `use std::error::Error;
use std::fmt::{self, Display};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWriteExt, ReadBuf};

struct Silent;
impl Wake for Silent {
    fn wake(self: Arc<Self>) {}
}
fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
    let waker = Waker::from(Arc::new(Silent));
    let mut context = Context::from_waker(&waker);
    future.poll(&mut context)
}
struct OneByte<S> {
    inner: S,
}
impl<S: AsyncRead + Unpin> AsyncRead for OneByte<S> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        let mut byte = [0; 1];
        let mut limited = ReadBuf::new(&mut byte);
        match Pin::new(&mut self.inner).poll_read(context, &mut limited) {
            Poll::Ready(Ok(())) => {
                output.put_slice(limited.filled());
                Poll::Ready(Ok(()))
            }
            Poll::Ready(Err(error)) => Poll::Ready(Err(error)),
            Poll::Pending => Poll::Pending,
        }
    }
}
#[derive(Debug)]
struct Marker(&'static str);
impl Display for Marker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}
impl Error for Marker {}
struct ErrorReader(Option<io::Error>);
impl AsyncRead for ErrorReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        _: &mut Context<'_>,
        _: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        match self.0.take() {
            Some(error) => Poll::Ready(Err(error)),
            None => panic!("reader was polled after its error"),
        }
    }
}

#[tokio::test(flavor = "current_thread")]
async fn retains_raw_bytes_after_cancel_then_finishes_at_eof() {
    let (mut writer, reader) = io::duplex(8);
    writer.write_all(b"cat").await.unwrap();
    let mut reader = OneByte { inner: reader };
    let mut saved = Vec::new();
    let mut first_attempt = Box::pin(continue_collect(&mut reader, &mut saved, 4));
    assert!(poll_once(first_attempt.as_mut()).is_pending());
    drop(first_attempt);
    assert_eq!(saved, b"cat");

    writer.write_all(b"!").await.unwrap();
    writer.shutdown().await.unwrap();
    continue_collect(&mut reader, &mut saved, 4).await.unwrap();
    assert_eq!(saved, b"cat!");
}

#[tokio::test(flavor = "current_thread")]
async fn limit_and_non_copy_error_are_observable_without_unbounded_growth() {
    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(b"cat").await.unwrap();
    writer.shutdown().await.unwrap();
    let mut saved = Vec::new();
    let error = continue_collect(&mut reader, &mut saved, 2).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    assert_eq!(saved, b"ca");

    let mut reader = ErrorReader(Some(io::Error::new(io::ErrorKind::Other, Marker("collect marker"))));
    let error = continue_collect(&mut reader, &mut Vec::new(), 1)
        .await
        .unwrap_err();
    let marker = error
        .get_ref()
        .and_then(|inner| inner.downcast_ref::<Marker>());
    assert_eq!(marker.map(|value| value.0), Some("collect marker"));
}

#[tokio::test(flavor = "current_thread")]
async fn zero_limit_accepts_clean_eof_but_consumes_one_rejected_byte() {
    let (mut writer, mut reader) = io::duplex(8);
    writer.shutdown().await.unwrap();
    let mut saved = Vec::new();
    continue_collect(&mut reader, &mut saved, 0).await.unwrap();
    assert!(saved.is_empty());

    let (mut writer, mut reader) = io::duplex(8);
    writer.write_all(b"xy").await.unwrap();
    writer.shutdown().await.unwrap();
    let mut saved = Vec::new();
    let error = continue_collect(&mut reader, &mut saved, 0).await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    assert!(saved.is_empty());
    let mut remaining = [0; 1];
    assert_eq!(reader.read(&mut remaining).await.unwrap(), 1);
    assert_eq!(&remaining, b"y");
}`;

export const tokioIoLessons: Lesson[] = [
  {
    id: "tokio-async-read-write",
    moduleId: "tokio-io-streams",
    conceptIds: ["tokio-duplex-read-write"],
    competencyIds: ["write-complete-tokio-streams"],
    prerequisites: ["tokio-graceful-shutdown"],
    title: "Porcje bajtów",
    subtitle:
      "Zobaczysz partial write, prześlesz pełną odpowiedź i ograniczysz transfer bez zjadania reszty inputu.",
    minutes: 29,
    outcomes: [
      "Odróżnisz pojedynczy write od write_all oraz określisz, kiedy peer może zobaczyć EOF.",
      "Napiszesz ograniczony transfer R → W, który zachowuje nieprzekazaną resztę readera.",
      "Przeniesiesz rzeczywisty io::Error bez zamiany go na tekst albo Copy flagę.",
    ],
    steps: [
      choose(
        "tokio-async-read-write-predict",
        "predict",
        "Czy write wysyła całą wiadomość?",
        'Duplex ma pojemność 2, a writer dostaje cztery bajty. Co może zwrócić jedno `write(b"rust")`?',
        0,
        [
          "Ok(2), bo write może przekazać tylko prefiks dostępny w obecnej pojemności.",
          "Ok(4), bo każdy slice jest atomową wiadomością Tokio.",
          "Err, bo pojemność duplex musi być co najmniej tak duża jak slice.",
        ],
        [
          "Tak. AsyncWrite przekazuje porcję; caller musi zdecydować, czy chce obsłużyć ten wynik, czy użyć write_all.",
          "Slice jest pamięcią caller-a, nie granicą transportu. Transport może przyjąć krótszy prefiks.",
          "Brak pełnej pojemności tworzy backpressure, a nie błąd sam w sobie.",
        ],
      ),
      tokioRun(
        "tokio-async-read-write-run",
        "Uruchom częściowy write",
        "Uruchom przykład. `written=2` nie oznacza uszkodzenia: peer odbiera dokładnie przekazany prefiks. Pełna odpowiedź wymaga pętli write_all.",
        partialWriteRun,
        "written=2\nread=2, bytes=ru\n",
      ),
      choose(
        "tokio-async-read-write-explain",
        "explain",
        "Flush czy shutdown?",
        "Chcesz, by druga strona po odpowiedzi wiedziała, że więcej bajtów już nie nadejdzie. Który krok dodajesz po pełnym zapisie?",
        2,
        [
          "Następny write z pustym slice, bo pusty slice zawsze oznacza EOF.",
          "Tylko flush, bo flush zamyka write half i reader zwróci 0.",
          "shutdown write half; peer po odebraniu bufora dostanie read == 0.",
        ],
        [
          "Pusty write nie zamyka streamu; zwykle po prostu zwraca zero przekazanych bajtów.",
          "Flush przekazuje dane z buforów, lecz stream może później dostać kolejne write.",
          "Tak. Shutdown ma semantykę końca write half; to osobna decyzja protokołu.",
        ],
      ),
      tokioExercise({
        id: "tokio-async-read-write-reply-gate",
        kind: "modify",
        title: "Dostarcz całą odpowiedź",
        prompt:
          "Uzupełnij `write_reply`. Ma przekazać każdy bajt `reply` do dowolnego AsyncWrite, a potem flush. Test używa `duplex(2)`: pierwszy kontrolowany poll musi zatrzymać się po realnym prefiksie, peer odbiera go, a kolejne polle dostarczają resztę. Zwróć pierwotny `io::Error` bez zastępowania go własnym tekstem. Ten helper jest do operacji awaitowanej do końca; wznowienie anulowanego zapisu zaprojektujesz osobno później.",
        code: writeReplyStarter,
        solution: writeReplySolution,
        tests: writeReplyTests,
        hints: [
          "`write` może zwrócić liczbę mniejszą od długości slice. `write_all` wykonuje potrzebne kolejne write.",
          "Po `?` zachowujesz ten sam io::Error. Flush jest oddzielnym ostatnim await.",
        ],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-async-read-write-transfer-blank",
        kind: "blank",
        title: "Od pustej kartki: przenieś ograniczony prefiks",
        prompt:
          "Od pustej kartki zdefiniuj generyczną async funkcję `transfer_prefix`, która przyjmuje mutowalny AsyncRead, mutowalny AsyncWrite i limit u64, a zwraca liczbę przesłanych bajtów lub io::Error. Czytaj małym własnym buforem, zatrzymaj się po EOF albo dokładnie na limicie, przekaż każdą odczytaną porcję w całości, na końcu flush. Limit 0 nie może odczytać inputu. Nie używaj read_to_end ani nie alokuj według długości nieznanego streamu: test ma jednobajtowe wrappery nad prawdziwym duplex i sprawdza, że byte za limitem zostaje w readerze.",
        solution: transferPrefixSolution,
        tests: transferPrefixTests,
        hints: [
          "W każdym obrocie ogranicz slice do `min(limit - moved, buffer.len())`.",
          "Gdy `read` zwróci 0, przerwij pętlę. Gdy zwróci n, write_all tylko `&buffer[..n]`.",
        ],
        forbiddenPatterns: [".read_to_end(", "tokio::io::copy("],
        gate: true,
      }),
    ],
    misconceptions: [
      "Jedno write jest równoznaczne z wysłaniem całej wiadomości.",
      "Flush przekazuje EOF drugiej stronie.",
      "Limit transferu uprawnia kod do odczytania i ukrycia bajtu za limitem.",
    ],
    transferTask:
      "Masz proces, który ma odesłać najwyżej 4096 bajtów pliku, zachować pozostałą część do następnego żądania i potem zamknąć output. Wskaż oddzielnie granicę transferu, moment flush i moment shutdown.",
    evidenceGate:
      "Pierwszy gate obserwuje rzeczywisty partial write duplex i pełne dostarczenie po odblokowaniu; blank używa krótkich read/write, zachowuje remainder po limicie, obsługuje 0/EOF oraz niekopiowalny błąd.",
    sourceIds: [
      "tokio-async-read",
      "tokio-async-write",
      "tokio-async-read-ext",
      "tokio-async-write-ext",
      "tokio-duplex",
    ],
  },
  {
    id: "tokio-framing-eof",
    moduleId: "tokio-io-streams",
    conceptIds: ["tokio-bounded-frame-eof"],
    competencyIds: ["decode-bounded-tokio-frames"],
    prerequisites: ["tokio-async-read-write"],
    title: "Ramka, EOF i limit",
    subtitle:
      "Odczytasz i zapiszesz ramkę z długością u16, bez mylenia końca streamu z uszkodzonym komunikatem.",
    minutes: 32,
    outcomes: [
      "Zdekodujesz header u16 big-endian mimo krótkich odczytów.",
      "Rozróżnisz clean EOF, ucięty header, ucięte body i deklarację ponad limit.",
      "Zweryfikujesz długość każdej ramki przed pierwszym bajtem outputu.",
    ],
    steps: [
      choose(
        "tokio-framing-eof-predict",
        "predict",
        "Czy jeden bajt może być końcem?",
        "Protokół zaczyna ramkę od dwóch bajtów długości. Reader dostaje pierwszy bajt headera, a potem zwraca 0. Jaki wynik ma dać dekoder?",
        1,
        [
          "None, bo każde 0 oznacza czyste EOF bez względu na postęp.",
          "UnexpectedEof, bo rozpoczęty dwubajtowy header nie jest pełną ramką.",
          "Pusty Vec, bo brakujący bajt długości można uznać za zero.",
        ],
        [
          "None jest zarezerwowane dla EOF przed pierwszym bajtem nowej ramki.",
          "Tak. Jeden bajt już zmienia interpretację kolejnych danych, więc nie można go ukryć jako normalnego końca.",
          "Dopowiadanie brakującego bajtu zmienia komunikat i ukrywa uszkodzenie streamu.",
        ],
      ),
      tokioRun(
        "tokio-framing-eof-run",
        "Zobacz header i body",
        "Uruchom przykład. Dwa kolejne read z kontrolowanymi buforami rozdzielają header długości od body; w realnym readerze każdy z nich nadal może wrócić krótszy.",
        framedReadRun,
        "length=3\nbody=cat\n",
      ),
      choose(
        "tokio-framing-eof-explain",
        "explain",
        "Kiedy wolno utworzyć body?",
        "Header deklaruje body długości 4096, lecz ten typ komunikatu ma limit 1024. Co robi poprawny dekoder przed kolejnym read?",
        0,
        [
          "Zwraca InvalidData przed Vec i nie konsumuje body tej ramki.",
          "Alokuje Vec 4096, a limit sprawdza po odczytaniu wszystkich bajtów.",
          "Czyta body przez read_to_end, bo EOF poda faktyczną długość.",
        ],
        [
          "Tak. Limit chroni pamięć i wyznacza granicę protokołu zanim parser zmieni stan body.",
          "To daje zdalnej deklaracji kontrolę nad alokacją i zjada dane przed odrzuceniem.",
          "read_to_end nie ma granicy ramki, może rosnąć do EOF i nie jest odpowiednią operacją wznawianą po anulowaniu.",
        ],
      ),
      tokioExercise({
        id: "tokio-framing-eof-read-gate",
        kind: "modify",
        title: "Odczytaj jedną ograniczoną ramkę",
        prompt:
          "Uzupełnij `read_one_frame`. Protokół ma `[u16 big-endian][body]`. Zwróć None tylko dla EOF przed pierwszym bajtem headera; zwróć UnexpectedEof po jednym bajcie headera albo niepełnym body. Po kompletnym headerze odrzuć długość większą od limitu przez InvalidData zanim utworzysz Vec i zanim odczytasz body. Test używa jednobajtowego wrappera prawdziwego duplex, sprawdza dokładne body, wszystkie rodzaje EOF, niezużyte body ponad limitem i niekopiowalny błąd readera. Ten Future ma lokalny postęp, więc awaituj go do wyniku; nie używaj go jako anulowanej gałęzi select.",
        code: readFrameStarter,
        solution: readFrameSolution,
        tests: readFrameTests,
        hints: [
          "Pętla headera pamięta liczbę wypełnionych bajtów. `read == 0` ma inne znaczenie przy 0 i przy 1 bajcie.",
          "Dopiero po sprawdzeniu `length <= limit` utwórz `vec![0; length]` i wypełnij ją krótkimi read.",
        ],
        forbiddenPatterns: [".read_exact(", ".read_to_end("],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-framing-eof-write-blank",
        kind: "blank",
        title: "Od pustej kartki: zakoduj jedną ramkę",
        prompt:
          "Od pustej kartki zdefiniuj generyczną async funkcję `write_one_frame`, która przyjmuje mutowalny AsyncWrite, slice body i limit usize, a zwraca io::Result. Zanim wykona pierwszy write sprawdź jednocześnie limit aplikacji i maksymalną długość u16; po błędzie writer nie może dostać nawet headera. Dla poprawnego body zapisz dwa bajty big-endian, potem całe body i flush. Test wymusza krótkie write przez `duplex(2)`, sprawdza puste body, pozostawienie outputu pustego po błędzie oraz niekopiowalny błąd writer-a.",
        solution: writeFrameSolution,
        tests: writeFrameTests,
        hints: [
          "`u16::MAX as usize` jest twardą granicą formatu, a limit parametru jest granicą aplikacji.",
          "Walidacja poprzedza oba write_all. Header to `(body.len() as u16).to_be_bytes()`.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "EOF po części headera jest tym samym co EOF przed nową ramką.",
      "u16 w formacie zwalnia aplikację z własnego limitu pamięci.",
      "Można najpierw wysłać header, a potem dopiero odrzucić body za duże dla polityki.",
    ],
    transferTask:
      "Zaprojektuj komunikat dla obrazka, którego body ma maksymalnie 1 MiB, ale lokalny format trzyma długość w u32. Wypisz kolejność: header, walidacja formatu, limit aplikacji, alokacja, czytanie i reakcja na częściowe EOF.",
    evidenceGate:
      "Gate dekodera przechodzi tylko dla krótkich read z prawdziwego duplex, czystego EOF i wszystkich odmian ucięcia; blank waliduje przed pierwszym bajtem, koduje dokładne u16/body i obsługuje krótkie write oraz błędy.",
    sourceIds: [
      "tokio-async-read-ext",
      "tokio-async-write-ext",
      "tokio-duplex",
    ],
  },
  {
    id: "tokio-retained-frame-progress",
    moduleId: "tokio-io-streams",
    conceptIds: ["tokio-cancellation-safe-frame-progress"],
    competencyIds: ["retain-tokio-stream-progress"],
    prerequisites: ["tokio-framing-eof"],
    title: "Wznów ramkę",
    subtitle:
      "Przeniesiesz bytes i offset poza Future, aby retry nie zgubił ani nie powtórzył części streamu.",
    minutes: 37,
    outcomes: [
      "Zachowasz header i body ramki, gdy Future czeka na kolejny bajt.",
      "Wznowisz zapis od offsetu po realnym partial write bez duplikacji prefixu.",
      "Rozpoznasz, że cancellation safety pojedynczego read/write wymaga caller-owned state dla całej operacji.",
    ],
    steps: [
      choose(
        "tokio-retained-frame-progress-predict",
        "predict",
        "Gdzie mieszka postęp?",
        "Dekoder odebrał pełny header i jeden bajt body, po czym jego Future zostało upuszczone w Pending. Co musi przetrwać, aby następne wywołanie dokończyło tę samą ramkę?",
        2,
        [
          "Tylko limit, bo stream odtworzy wszystkie wcześniejsze bajty przy następnym read.",
          "Wyłącznie Vec body, bo header można zawsze bezpiecznie przeczytać drugi raz.",
          "Header, liczba jego bajtów, oczekiwana długość i już zebrane body w stanie caller-a.",
        ],
        [
          "Reader przesuwa się po przekazanych bajtach; nie odtwarza ich po Drop Future.",
          "Bez headera nie wiesz już, gdzie kończy się body ani czy długość była zaakceptowana.",
          "Tak. To stan protokołu, który jest starszy niż pojedynczy Future i dlatego może zostać wznowiony.",
        ],
      ),
      choose(
        "tokio-retained-frame-progress-explain",
        "explain",
        "Dlaczego write_all nie wystarcza?",
        "`write_all` zdążył przekazać dwubajtowy header, potem zwrócił Pending na body i całe Future zostało upuszczone. Co grozi retry z początkiem ramki?",
        1,
        [
          "Nic: write_all gwarantuje, że po Drop Future header automatycznie znika z peer-a.",
          "Drugi header; offset był lokalny dla porzuconego Future, choć pierwsze write już zmieniło stream.",
          "Tylko wolniejsza praca, bo write_all zawsze jest cancellation safe jako całość.",
        ],
        [
          "Transport nie cofa gotowego write. Anulowanie nie jest transakcją I/O.",
          "Tak. PendingWrite zapisuje offset po każdym gotowym write i kolejny Future zaczyna od niego.",
          "Pojedynczy write jest cancellation safe; pętla ukryta w write_all ma lokalny postęp, którego caller nie odzyskuje.",
        ],
      ),
      tokioRun(
        "tokio-retained-frame-progress-run",
        "Zobacz częściowy stan",
        "Uruchom przykład. Reader odebrał już pełny header i prefiks body; następny Future nie może udawać, że te trzy bajty nadal są w duplex.",
        retainedProgressRun,
        "length=3\nbody-prefix=c\n",
      ),
      tokioExercise({
        id: "tokio-retained-frame-progress-read-gate",
        kind: "modify",
        title: "Zachowaj postęp odczytu ramki",
        prompt:
          "Uzupełnij `FrameState` i `continue_frame`. Format pozostaje `[u16 big-endian][body]`, a `FrameState::new(limit)` ma przechować limit, częściowy header, długość i body. Po każdym udanym `read` natychmiast przenieś wynik do state; gdy kontrolowany poll zatrzyma się w Pending, Drop Future nie może skasować zebranych bajtów. Kolejne wywołanie na tym samym readerze musi zwrócić dokładnie jedną ramkę i zresetować state dla następnej. Zostaw clean EOF, truncated body, oversize i prawdziwy io::Error rozróżnialne. Nie używaj read_exact ani read_to_end.",
        code: frameStateStarter,
        solution: frameStateSolution,
        tests: frameStateTests,
        hints: [
          "Header i body wypełniaj przez `read`, a licznik zwiększaj dopiero po Ok(n). Tokio gwarantuje, że anulowany Pending read nie pobrał danych.",
          "Po kompletnej ramce przenieś Vec z state, wyczyść header/liczniki i dopiero wtedy zwróć Some(body).",
        ],
        forbiddenPatterns: [".read_exact(", ".read_to_end("],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-retained-frame-progress-write-blank",
        kind: "blank",
        title: "Od pustej kartki: wznawialny zapis ramki",
        prompt:
          "Od pustej kartki zdefiniuj `PendingWriteError`, `PendingWrite` i generyczną async funkcję `continue_write`. `PendingWrite::new` przyjmuje własne Vec body i limit; po odrzuceniu zwraca `TooLarge { body, limit }`, a po akceptacji reprezentuje ramkę `[u16 big-endian][body]`. `written` zgłasza już przekazane bajty, a `is_complete` może znaczyć tylko tyle, że writer przyjął wszystkie bytes — wynik flush nadal należy do `continue_write`. Funkcja ma wznowić zapis po porzuconym Pending Future bez duplikacji headera lub body, rozpoznać WriteZero i zachować pierwotny niekopiowalny błąd writer-a. Test wykonuje kontrolowany partial write na duplex, porzuca Future, potem retry; dodatkowo sprawdza Pending i błąd flush.",
        solution: pendingWriteSolution,
        tests: pendingWriteTests,
        hints: [
          "Najpierw zapisz `let length = body.len()`, żeby w TooLarge zwrócić to samo przeniesione Vec.",
          "W pętli użyj `writer.write(&state.bytes[state.offset..])`; write_all ukryłby offset wewnątrz porzucanego Future.",
        ],
        forbiddenPatterns: [".write_all(", ".read_exact(", ".read_to_end("],
        gate: true,
      }),
    ],
    misconceptions: [
      "Cancellation safe read/write automatycznie zachowuje postęp całej własnej pętli async.",
      "Po porzuceniu write_all można zawsze zacząć ramkę od headera bez zmiany outputu.",
      "Limit alokacji ma znaczenie tylko przy pierwszym odczycie, nie przy stanie wznawianym.",
    ],
    transferTask:
      "W workerze, który może dostać stop między pollami, opisz osobno stan odczytu i zapisu dla ramek z komendy dyskowej. Wskaż dokładnie, który byte offset zapisujesz po Ready, kiedy uznajesz EOF za sukces i które błędy pozostawiają operację do raportowania zamiast retry.",
    evidenceGate:
      "Gate czytania porzuca Future po skończonym headerze i prefiksie body, następnie sprawdza dokładne wznowienie; blank porzuca zapis po headerze i dowodzi kontrolowanymi pollami, że retry emituje tylko pozostałe bajty oraz zachowuje owned body/error.",
    sourceIds: [
      "tokio-async-read-ext",
      "tokio-async-write-ext",
      "tokio-duplex",
    ],
  },
];

export const tokioIoReviewExercises: Record<string, LessonStep> = {
  "tokio-duplex-read-write": tokioExercise({
    id: "review-tokio-async-read-write",
    kind: "apply",
    title: "Wyślij i zamknij write half",
    prompt:
      "Napisz `send_and_close` dla mutowalnego AsyncWrite i slice odpowiedzi. To inny kontrakt niż write_reply: po pełnym zapisie ma wykonać shutdown, aby peer po odebraniu wszystkich bajtów zobaczył EOF. Obsłuż także pusty slice. Nie twórz osobnego taska ani nie zgaduj EOF z flush.",
    solution: sendAndCloseSolution,
    tests: sendAndCloseTests,
    hints: [
      "Znajdź w AsyncWriteExt operację, która kończy write half po odpowiedzi.",
      "EOF jest stanem streamu widocznym po istniejących danych, nie dodatkowym bajtem odpowiedzi.",
    ],
  }),
  "tokio-bounded-frame-eof": tokioExercise({
    id: "review-tokio-framing-eof",
    kind: "apply",
    title: "Zatwierdź całą paczkę ramek",
    prompt:
      "Napisz `write_frame_batch` dla AsyncWrite, slice ramek i limitu. To nie jest pojedyncza ramka: zanim wypiszesz pierwszy header sprawdź każdą ramkę pod kątem limitu aplikacji oraz u16. Potem zakoduj wszystkie ramki w kolejności, flush raz i zwróć ich liczbę. Jeśli druga ramka jest za duża, pierwsza nie może wyciec do outputu.",
    solution: writeFrameBatchSolution,
    tests: writeFrameBatchTests,
    hints: [
      "Wskaż moment, w którym cała paczka może jeszcze zostać odrzucona bez obserwowalnego outputu.",
      "Żadna porcja outputu nie jest dozwolona, dopóki każda ramka nie spełnia obu granic długości.",
    ],
  }),
  "tokio-cancellation-safe-frame-progress": tokioExercise({
    id: "review-tokio-retained-frame-progress",
    kind: "apply",
    title: "Wznów ograniczone zbieranie do EOF",
    prompt:
      "Napisz `continue_collect`, które przyjmuje AsyncRead, caller-owned `Vec<u8>` i limit. Dopisuj tylko bytes z gotowego read, więc Drop Future w Pending pozostawia już zebrane dane do retry. Zwróć Ok dopiero na EOF; gdy zebrane bytes osiągną limit, wykonaj jednobajtową próbę, aby rozróżnić EOF od przekroczenia limitu bez rosnącej alokacji. Ta próba zużywa byte ponad limitem, dlatego InvalidData jest terminalnym odrzuceniem streamu, nie wynikiem do retry. Retry dotyczy wyłącznie Future porzuconego w Pending. Ten kontrakt jest celowo inny niż FrameState: zbiera surowy, skończony stream zamiast jednej ramki.",
    solution: continueCollectSolution,
    tests: continueCollectTests,
    hints: [
      "Porównaj lifetime Vec caller-a z lifetime pojedynczego Future i znajdź miejsce, w którym postęp może zostać zapisany.",
      "Stan zmieniaj tylko po gotowym read; po błędzie limitu stream jest odrzucony.",
    ],
    forbiddenPatterns: [".read_to_end(", ".read_exact("],
  }),
};
