import { choose, tokioExercise, tokioRun } from "./tokio-helpers";
import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const tokioTcpSources: Source[] = [
  {
    id: "tokio-tcp-listener",
    title: "Tokio 1.53: net::TcpListener",
    url: "https://docs.rs/tokio/1.53.1/tokio/net/struct.TcpListener.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki bind, accept albo zwracanych adresów lokalnych i peer-a.",
  },
  {
    id: "tokio-tcp-stream",
    title: "Tokio 1.53: net::TcpStream",
    url: "https://docs.rs/tokio/1.53.1/tokio/net/struct.TcpStream.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie connect, local_addr, peer_addr albo rozdzielania streamu na owned halves.",
  },
  {
    id: "tokio-tcp-owned-write-half",
    title: "Tokio 1.53: net::tcp::OwnedWriteHalf",
    url: "https://docs.rs/tokio/1.53.1/tokio/net/tcp/struct.OwnedWriteHalf.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie własności halves lub skutków explicit shutdown i Drop write half.",
  },
  {
    id: "tokio-async-write-shutdown",
    title: "Tokio 1.53: io::AsyncWriteExt::shutdown",
    url: "https://docs.rs/tokio/1.53.1/tokio/io/trait.AsyncWriteExt.html#method.shutdown",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu shutdown, flush albo propagowania io::Error.",
  },
];

export const tokioTcpCompetencies: Competency[] = [
  {
    id: "own-a-connected-tcp-stream",
    title:
      "Łączysz listener i klienta na loopback, zachowując własność TcpStream oraz tożsamość endpointów.",
  },
  {
    id: "close-one-tcp-direction",
    title:
      "Kończysz kierunek zapisu po pełnym żądaniu, nadal czytasz odpowiedź i raportujesz błąd I/O.",
  },
];

export const tokioTcpConcepts: Concept[] = [
  {
    id: "tokio-tcp-ownership",
    title: "TcpStream pozostaje posiadanym połączeniem po connect i accept",
    prerequisites: ["tokio-blocking-cooperative-stop"],
    competencyIds: ["own-a-connected-tcp-stream"],
    reviewPrompt:
      "Co zwracają connect i accept, które adresy opisują socket oraz dlaczego helper po preambule powinien zwrócić TcpStream zamiast go od razu dropować?",
    reviewAnswer:
      "`TcpStream::connect` zwraca posiadany stream klienta. `TcpListener::accept` zwraca posiadany stream serwera razem z adresem peer-a; `local_addr` opisuje lokalny endpoint danego streamu, a `peer_addr` drugi endpoint. Po wysłaniu albo odebraniu preambuły helper może zwrócić ten sam stream, więc caller nadal decyduje o suffixie, odpowiedzi i zamknięciu. Jeden write nie jest granicą wiadomości: odbiór musi czytać potrzebną liczbę bajtów albo jawnie ustaloną granicę EOF/ramki.",
    distinguish:
      "Port 0 jest prośbą o efemeryczny port tylko podczas bind; po udanym bind `local_addr` zwraca konkretny port. Nie sonduj osobno wolnego portu, bo między sondą i bind inny proces może go zająć. Udany write lub flush przekazuje dane do transportu, ale nie dowodzi, że druga aplikacja już je przetworzyła.",
  },
  {
    id: "tokio-tcp-directional-shutdown",
    title: "shutdown kończy write half, a read half może nadal działać",
    prerequisites: ["tokio-tcp-ownership"],
    competencyIds: ["close-one-tcp-direction"],
    reviewPrompt:
      "Dlaczego klient po wysłaniu żądania wywołuje shutdown write half przed read odpowiedzi i co zmienia rozdzielenie TcpStream na owned read/write halves?",
    reviewAnswer:
      "`shutdown().await` na writerze sygnalizuje peer-owi EOF tylko dla naszego kierunku zapisu. Po wysłaniu kompletnego żądania serwer może dojść do EOF, przetworzyć je i odesłać odpowiedź, a lokalny reader nadal może ją odebrać. `into_split` daje niezależnie posiadane halves; OwnedWriteHalf może zostać zapisany i zamknięty bez odbierania OwnedReadHalf. To nadal jedno połączenie i nie oznacza zamknięcia odpowiedzi peer-a.",
    distinguish:
      "Drop całego TcpStream kończy oba kierunki. Drop OwnedWriteHalf również kończy write half, lecz jawne `shutdown` komunikuje tę decyzję w miejscu protokołu i pozwala obsłużyć jego io::Result. Flush nie daje EOF, a read pojedynczego chunka nie jest dowodem granicy żądania TCP.",
  },
];

const tcpConnectRun = `use std::net::Ipv4Addr;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[tokio::main(flavor = "current_thread")]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await?;
    let address = listener.local_addr()?;
    assert!(address.ip().is_loopback());
    assert_ne!(address.port(), 0);

    let client = async {
        let mut stream = TcpStream::connect(address).await?;
        let local = stream.local_addr()?;
        assert_eq!(stream.peer_addr()?, address);
        stream.write_all(b"request").await?;
        stream.shutdown().await?;
        let mut reply = Vec::new();
        stream.read_to_end(&mut reply).await?;
        Ok::<_, std::io::Error>((local, reply))
    };
    let server = async {
        let (mut stream, peer) = listener.accept().await?;
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await?;
        stream.write_all(b"ok").await?;
        stream.shutdown().await?;
        Ok::<_, std::io::Error>((peer, request))
    };

    let (client, server) = tokio::join!(client, server);
    let (client_local, reply) = client?;
    let (peer, request) = server?;
    assert_eq!(client_local, peer);
    assert_eq!(request, b"request");
    assert_eq!(reply, b"ok");
    println!("listener=loopback");
    println!("request=request");
    println!("reply=ok");
    Ok(())
}`;

const connectPreambleStarter = `use std::net::SocketAddr;
use tokio::io::{self, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;

async fn write_preamble<W: AsyncWrite + Unpin>(writer: &mut W, preamble: &[u8]) -> io::Result<()> {
    writer.write(preamble).await?;
    Ok(())
}

async fn connect_after_preamble(addr: SocketAddr, preamble: &[u8]) -> io::Result<TcpStream> {
    let mut stream = TcpStream::connect(addr).await?;
    write_preamble(&mut stream, preamble).await?;
    Ok(stream)
}`;

const connectPreambleSolution = `use std::net::SocketAddr;
use tokio::io::{self, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;

async fn write_preamble<W: AsyncWrite + Unpin>(writer: &mut W, preamble: &[u8]) -> io::Result<()> {
    writer.write_all(preamble).await?;
    writer.flush().await
}

async fn connect_after_preamble(addr: SocketAddr, preamble: &[u8]) -> io::Result<TcpStream> {
    let mut stream = TcpStream::connect(addr).await?;
    write_preamble(&mut stream, preamble).await?;
    Ok(stream)
}`;

const connectPreambleTests = `#[tokio::test(flavor = "current_thread")]
async fn returns_the_same_usable_stream_after_exact_preamble_and_suffix() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, peer) = listener.accept().await.unwrap();
        let mut received = Vec::new();
        stream.read_to_end(&mut received).await.unwrap();
        stream.write_all(b"ack").await.unwrap();
        stream.shutdown().await.unwrap();
        (peer, received)
    };
    let client = async {
        let mut stream = connect_after_preamble(address, b"hello").await.unwrap();
        let local = stream.local_addr().unwrap();
        assert_eq!(stream.peer_addr().unwrap(), address);
        stream.write_all(b":suffix").await.unwrap();
        stream.shutdown().await.unwrap();
        let mut reply = Vec::new();
        stream.read_to_end(&mut reply).await.unwrap();
        (local, reply)
    };
    let ((peer, received), (local, reply)) = tokio::join!(server, client);
    assert_eq!(local, peer);
    assert_eq!(received, b"hello:suffix");
    assert_eq!(reply, b"ack");
}

#[tokio::test(flavor = "current_thread")]
async fn writes_every_byte_and_flushes_with_a_controlled_short_writer() {
    use std::io;
    use std::pin::Pin;
    use std::task::{Context, Poll};
    use tokio::io::AsyncWrite;

    struct ShortWriter {
        bytes: Vec<u8>,
        flushes: usize,
    }
    impl AsyncWrite for ShortWriter {
        fn poll_write(
            mut self: Pin<&mut Self>,
            _: &mut Context<'_>,
            input: &[u8],
        ) -> Poll<io::Result<usize>> {
            let written = input.len().min(2);
            self.bytes.extend_from_slice(&input[..written]);
            Poll::Ready(Ok(written))
        }
        fn poll_flush(mut self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            self.flushes += 1;
            Poll::Ready(Ok(()))
        }
        fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            Poll::Ready(Ok(()))
        }
    }

    let mut writer = ShortWriter { bytes: Vec::new(), flushes: 0 };
    write_preamble(&mut writer, b"preamble").await.unwrap();
    assert_eq!(writer.bytes, b"preamble");
    assert_eq!(writer.flushes, 1);
}

#[tokio::test(flavor = "current_thread")]
async fn preserves_the_writer_error() {
    use std::io;
    use std::pin::Pin;
    use std::task::{Context, Poll};
    use tokio::io::AsyncWrite;

    struct BrokenWriter;
    impl AsyncWrite for BrokenWriter {
        fn poll_write(
            self: Pin<&mut Self>,
            _: &mut Context<'_>,
            _: &[u8],
        ) -> Poll<io::Result<usize>> {
            Poll::Ready(Err(io::Error::new(io::ErrorKind::BrokenPipe, "kept")))
        }
        fn poll_flush(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            Poll::Ready(Ok(()))
        }
        fn poll_shutdown(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<io::Result<()>> {
            Poll::Ready(Ok(()))
        }
    }

    let mut writer = BrokenWriter;
    let error = write_preamble(&mut writer, b"preamble").await.unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::BrokenPipe);
}`;

const acceptPreambleSolution = `use std::net::SocketAddr;
use tokio::io::{self, AsyncReadExt};
use tokio::net::{TcpListener, TcpStream};

async fn accept_preamble(
    listener: TcpListener,
    preamble_len: usize,
) -> io::Result<(TcpStream, SocketAddr, Vec<u8>)> {
    let (mut stream, peer) = listener.accept().await?;
    let mut preamble = vec![0; preamble_len];
    let mut filled = 0;
    while filled < preamble.len() {
        let read = stream.read(&mut preamble[filled..]).await?;
        if read == 0 {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "preamble ended before its declared length",
            ));
        }
        filled += read;
    }
    Ok((stream, peer, preamble))
}`;

const acceptPreambleTests = `#[tokio::test(flavor = "current_thread")]
async fn reads_only_the_preamble_and_returns_the_stream_for_its_suffix() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, peer, preamble) = accept_preamble(listener, 5).await.unwrap();
        let local = stream.local_addr().unwrap();
        let mut suffix = Vec::new();
        stream.read_to_end(&mut suffix).await.unwrap();
        (local, peer, preamble, suffix)
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        let local = stream.local_addr().unwrap();
        assert_eq!(stream.peer_addr().unwrap(), address);
        stream.write_all(b"hello:suffix").await.unwrap();
        stream.shutdown().await.unwrap();
        local
    };
    let ((server_local, peer, preamble, suffix), client_local) = tokio::join!(server, client);
    assert_eq!(server_local, address);
    assert_eq!(peer, client_local);
    assert_eq!(preamble, b"hello");
    assert_eq!(suffix, b":suffix");
}

#[tokio::test(flavor = "current_thread")]
async fn reports_eof_inside_a_preamble() {
    use std::net::Ipv4Addr;
    use tokio::io::AsyncWriteExt;
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        accept_preamble(listener, 5).await.unwrap_err().kind()
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        stream.write_all(b"tiny").await.unwrap();
        stream.shutdown().await.unwrap();
    };
    let (kind, ()) = tokio::join!(server, client);
    assert_eq!(kind, std::io::ErrorKind::UnexpectedEof);
}`;

const acceptLoopbackStarter = `use std::net::SocketAddr;
use tokio::io;
use tokio::net::{TcpListener, TcpStream};

fn validate_loopback_peer(peer: SocketAddr) -> io::Result<()> {
    Err(io::Error::new(io::ErrorKind::Other, format!("unexpected peer {peer}")))
}

async fn accept_loopback(listener: TcpListener) -> io::Result<(TcpStream, SocketAddr)> {
    let (stream, peer) = listener.accept().await?;
    validate_loopback_peer(peer)?;
    Ok((stream, peer))
}`;

const acceptLoopbackSolution = `use std::net::SocketAddr;
use tokio::io;
use tokio::net::{TcpListener, TcpStream};

fn validate_loopback_peer(peer: SocketAddr) -> io::Result<()> {
    if !peer.ip().is_loopback() {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "this exercise accepts loopback peers only",
        ));
    }
    Ok(())
}

async fn accept_loopback(listener: TcpListener) -> io::Result<(TcpStream, SocketAddr)> {
    let (stream, peer) = listener.accept().await?;
    validate_loopback_peer(peer)?;
    Ok((stream, peer))
}`;

const acceptLoopbackTests = `#[tokio::test(flavor = "current_thread")]
async fn validates_peer_policy_and_keeps_the_accepted_loopback_stream_owned() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let public_peer = SocketAddr::from(([203, 0, 113, 7], 4000));
    assert_eq!(
        validate_loopback_peer(public_peer).unwrap_err().kind(),
        std::io::ErrorKind::PermissionDenied,
    );
    validate_loopback_peer(SocketAddr::from((Ipv4Addr::LOCALHOST, 4000))).unwrap();

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, peer) = accept_loopback(listener).await.unwrap();
        let local = stream.local_addr().unwrap();
        let mut message = Vec::new();
        stream.read_to_end(&mut message).await.unwrap();
        (local, peer, message)
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        let local = stream.local_addr().unwrap();
        stream.write_all(b"owned-after-accept").await.unwrap();
        stream.shutdown().await.unwrap();
        local
    };
    let ((local, peer, message), client_local) = tokio::join!(server, client);
    assert_eq!(local, address);
    assert_eq!(peer, client_local);
    assert_eq!(message, b"owned-after-accept");
}`;

const tcpHalfCloseRun = `use std::net::Ipv4Addr;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[tokio::main(flavor = "current_thread")]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await?;
    let address = listener.local_addr()?;
    let server = async {
        let (mut stream, _) = listener.accept().await?;
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await?;
        stream.write_all(b"answer").await?;
        stream.shutdown().await?;
        Ok::<_, std::io::Error>(request)
    };
    let client = async {
        let stream = TcpStream::connect(address).await?;
        let (mut reader, mut writer) = stream.into_split();
        writer.write_all(b"ask").await?;
        writer.shutdown().await?;
        let mut reply = Vec::new();
        reader.read_to_end(&mut reply).await?;
        Ok::<_, std::io::Error>(reply)
    };

    let (request, reply) = tokio::join!(server, client);
    assert_eq!(request?, b"ask");
    assert_eq!(reply?, b"answer");
    println!("request-eof=true");
    println!("reply=answer");
    Ok(())
}`;

const requestThenReplyStarter = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

async fn request_then_reply(
    stream: TcpStream,
    request: &[u8],
    _max_reply: usize,
) -> io::Result<Vec<u8>> {
    let (_reader, mut writer) = stream.into_split();
    writer.write_all(request).await?;
    writer.shutdown().await?;
    Ok(Vec::new())
}`;

const requestThenReplySolution = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

async fn request_then_reply(
    stream: TcpStream,
    request: &[u8],
    max_reply: usize,
) -> io::Result<Vec<u8>> {
    let (mut reader, mut writer) = stream.into_split();
    writer.write_all(request).await?;
    writer.shutdown().await?;
    let mut reply = Vec::new();
    let mut buffer = [0; 1024];
    loop {
        let remaining = max_reply.saturating_sub(reply.len());
        let probe = buffer.len().min(remaining.saturating_add(1));
        let read = reader.read(&mut buffer[..probe]).await?;
        if read == 0 {
            break;
        }
        if read > remaining {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "reply exceeds this exchange limit",
            ));
        }
        reply.extend_from_slice(&buffer[..read]);
    }
    Ok(reply)
}`;

const requestThenReplyTests = `#[tokio::test(flavor = "current_thread")]
async fn writer_shutdown_allows_the_server_to_observe_request_eof_before_reply() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await.unwrap();
        stream.write_all(b"res").await.unwrap();
        stream.write_all(b"ponse").await.unwrap();
        stream.shutdown().await.unwrap();
        request
    };
    let client = async {
        let stream = TcpStream::connect(address).await.unwrap();
        request_then_reply(stream, b"request", 8).await.unwrap()
    };
    let (request, reply) = tokio::join!(server, client);
    assert_eq!(request, b"request");
    assert_eq!(reply, b"response");
}

#[tokio::test(flavor = "current_thread")]
async fn reading_an_empty_response_after_our_half_close_is_clean_eof() {
    use std::net::Ipv4Addr;
    use tokio::io::AsyncReadExt;
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await.unwrap();
        request
    };
    let client = async {
        let stream = TcpStream::connect(address).await.unwrap();
        request_then_reply(stream, b"done", 0).await.unwrap()
    };
    let (request, reply) = tokio::join!(server, client);
    assert_eq!(request, b"done");
    assert!(reply.is_empty());
}

#[tokio::test(flavor = "current_thread")]
async fn rejects_a_reply_larger_than_its_limit() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await.unwrap();
        stream.write_all(b"abcde").await.unwrap();
        stream.shutdown().await.unwrap();
        request
    };
    let client = async {
        let stream = TcpStream::connect(address).await.unwrap();
        request_then_reply(stream, b"request", 4).await.unwrap_err().kind()
    };
    let (request, kind) = tokio::join!(server, client);
    assert_eq!(request, b"request");
    assert_eq!(kind, std::io::ErrorKind::InvalidData);
}`;

const replyAfterEofSolution = `use tokio::io::{self, AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

async fn reply_after_eof(
    stream: TcpStream,
    response: &[u8],
    max_request: usize,
) -> io::Result<Vec<u8>> {
    let (mut reader, mut writer) = stream.into_split();
    let mut request = Vec::new();
    let mut buffer = [0; 1024];
    loop {
        let read = reader.read(&mut buffer).await?;
        if read == 0 {
            break;
        }
        if read > max_request - request.len() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "request exceeds this exchange limit",
            ));
        }
        request.extend_from_slice(&buffer[..read]);
    }
    writer.write_all(response).await?;
    writer.shutdown().await?;
    Ok(request)
}`;

const replyAfterEofTests = `#[tokio::test(flavor = "current_thread")]
async fn waits_for_request_eof_then_keeps_the_response_direction_open() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (stream, _) = listener.accept().await.unwrap();
        reply_after_eof(stream, b"done", 12).await.unwrap()
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        stream.write_all(b"request-").await.unwrap();
        stream.write_all(b"body").await.unwrap();
        stream.shutdown().await.unwrap();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        response
    };
    let (request, response) = tokio::join!(server, client);
    assert_eq!(request, b"request-body");
    assert_eq!(response, b"done");
}

#[tokio::test(flavor = "current_thread")]
async fn accepts_an_empty_request_at_zero_limit_and_still_sends_the_response() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (stream, _) = listener.accept().await.unwrap();
        reply_after_eof(stream, b"empty-ok", 0).await.unwrap()
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        stream.shutdown().await.unwrap();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        response
    };
    let (request, response) = tokio::join!(server, client);
    assert!(request.is_empty());
    assert_eq!(response, b"empty-ok");
}

#[tokio::test(flavor = "current_thread")]
async fn rejects_an_over_limit_request_without_sending_a_response() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (stream, _) = listener.accept().await.unwrap();
        reply_after_eof(stream, b"must-not-send", 4).await.unwrap_err().kind()
    };
    let client = async {
        let mut stream = TcpStream::connect(address).await.unwrap();
        stream.write_all(b"five!").await.unwrap();
        stream.shutdown().await.unwrap();
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.unwrap();
        response
    };
    let (kind, response) = tokio::join!(server, client);
    assert_eq!(kind, std::io::ErrorKind::InvalidData);
    assert!(response.is_empty());
}`;

const finishWriterStarter = `use tokio::io::{self, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;

async fn send_and_finish(_writer: OwnedWriteHalf, _bytes: &[u8]) -> io::Result<()> {
    Err(io::Error::new(io::ErrorKind::Other, "writer not finished"))
}`;

const finishWriterSolution = `use tokio::io::{self, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;

async fn send_and_finish(mut writer: OwnedWriteHalf, bytes: &[u8]) -> io::Result<()> {
    writer.write_all(bytes).await?;
    writer.shutdown().await
}`;

const finishWriterTests = `#[tokio::test(flavor = "current_thread")]
async fn owned_reader_receives_a_reply_after_its_owned_writer_finishes() {
    use std::net::Ipv4Addr;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = async {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut request = Vec::new();
        stream.read_to_end(&mut request).await.unwrap();
        stream.write_all(b"pong").await.unwrap();
        stream.shutdown().await.unwrap();
        request
    };
    let client = async {
        let stream = TcpStream::connect(address).await.unwrap();
        let (mut reader, writer) = stream.into_split();
        send_and_finish(writer, b"ping").await.unwrap();
        let mut reply = Vec::new();
        reader.read_to_end(&mut reply).await.unwrap();
        reply
    };
    let (request, reply) = tokio::join!(server, client);
    assert_eq!(request, b"ping");
    assert_eq!(reply, b"pong");
}`;

export const tokioTcpLessons: Lesson[] = [
  {
    id: "tokio-tcp-connect",
    moduleId: "tokio-network-service",
    conceptIds: ["tokio-tcp-ownership"],
    competencyIds: ["own-a-connected-tcp-stream"],
    prerequisites: ["tokio-blocking-cooperative-stop"],
    title: "Połącz dwa endpointy",
    subtitle:
      "Zwiążesz prawdziwy listener loopback z klientem i zachowasz TcpStream po preambule.",
    minutes: 31,
    outcomes: [
      "Zwiążesz listener z `127.0.0.1:0`, zachowasz go do accept i odczytasz wybrany adres.",
      "Rozróżnisz lokalny endpoint, peer oraz posiadany `TcpStream` zwracany przez connect i accept.",
      "Prześlesz dokładną preambułę bez traktowania pojedynczego TCP read lub write jako wiadomości.",
    ],
    steps: [
      choose(
        "tokio-tcp-connect-predict",
        "predict",
        "Co oznacza port 0?",
        "Listener wiąże `127.0.0.1:0`. Co zwróci `listener.local_addr()` po udanym bind?",
        1,
        [
          "Nadal port 0, bo dopiero connect wybiera port klienta.",
          "Konkretny niezerowy port wybrany przez system dla tego listenera.",
          "Adres publiczny komputera i pierwszy wolny port na wszystkich interfejsach.",
        ],
        [
          "0 jest argumentem bind, nie trwałym portem socketu.",
          "Tak. Przekaż ten konkretny adres klientowi, pozostawiając listener żywy do accept.",
          "Adres `127.0.0.1` ogranicza ten przykład do local host; nie jest adresem publicznym.",
        ],
      ),
      tokioRun(
        "tokio-tcp-connect-run",
        "Uruchom loopback connect i accept",
        "Uruchom przykład. Dwa Future działają współbieżnie: klient kończy własny write kierunek, serwer czyta do EOF i odsyła odpowiedź. Wydruk nie zakłada efemerycznego numeru portu.",
        tcpConnectRun,
        "listener=loopback\nrequest=request\nreply=ok\n",
      ),
      choose(
        "tokio-tcp-connect-explain",
        "explain",
        "Czy jedno write jest wiadomością?",
        'Klient wywołał `write_all(b"hello")`, a potem `write_all(b":suffix")`. Jak serwer powinien rozpoznać te bytes, jeśli jego protokół używa preambuły długości 5?',
        2,
        [
          "Dwa kolejne read zawsze dadzą dokładnie `hello` i `:suffix`.",
          "Pierwszy read musi dostać oba write, bo TCP scala zapisane slices.",
          "Czyta dokładnie pięć bajtów w pętli, a pozostałe bajty zostawia streamowi lub czyta według następnej granicy protokołu.",
        ],
        [
          "TCP nie zachowuje granic write przy odbiorze.",
          "TCP może scalać, ale może też dzielić dane w dowolnych miejscach.",
          "Tak. Preambuła jest regułą protokołu, nie własnością pojedynczego read ani write.",
        ],
      ),
      tokioExercise({
        id: "tokio-tcp-connect-gate",
        kind: "modify",
        title: "Zwróć połączony stream po preambule",
        prompt:
          "Uzupełnij `write_preamble` oraz `connect_after_preamble`. Pierwsza funkcja działa na dowolnym `AsyncWrite + Unpin`: przekazuje całą preambułę i flushuje ją. Druga łączy się z przekazanym loopback `SocketAddr`, używa tego helpera i zwraca ten sam posiadany `TcpStream`. Caller po powrocie dopisuje suffix, kończy write kierunek i czyta ack. Nie zamieniaj `io::Error` na tekst. Kontrolowany writer przyjmuje najwyżej dwa bytes na poll, więc pojedynczy `write` nie wystarcza.",
        code: connectPreambleStarter,
        solution: connectPreambleSolution,
        tests: connectPreambleTests,
        hints: [
          "`write_all` czeka, aż writer przyjmie wszystkie bajty slice; potem `flush` jest osobnym await z własnym wynikiem.",
          "Nie dropuj streamu w helperze. Własność wraca w `Ok(stream)` do callera.",
        ],
        forbiddenPatterns: [".write("],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-tcp-connect-blank",
        kind: "blank",
        title: "Od pustej kartki: accept dokładnej preambuły",
        prompt:
          "Od pustej kartki napisz `accept_preamble`. Funkcja otrzymuje posiadany listener i żądaną długość preambuły; ma zwrócić nadal używalny stream, adres peer-a i dokładne bytes preambuły. EOF przed kompletną preambułą ma być `UnexpectedEof`. Nie używaj `read_exact`: suffix po preambule ma zostać dla zwróconego streamu.",
        solution: acceptPreambleSolution,
        tests: acceptPreambleTests,
        hints: [
          "Bufor ma długość preambuły, ale `read` może wypełnić tylko jego fragment; licznik zwiększ po każdym `Ok(n)`.",
          "Gdy `read == 0` przed końcem, utwórz błąd `UnexpectedEof`; nie zwracaj części jako poprawnej preambuły.",
        ],
        forbiddenPatterns: [".read_exact("],
        gate: true,
      }),
    ],
    misconceptions: [
      "Port 0 jest wolnym portem, który można najpierw zapamiętać, zamknąć listener, a potem bezpiecznie ponownie zbindować.",
      "Każdy write po jednej stronie pojawi się jako jeden read po drugiej stronie.",
      "Pomyślny write albo flush dowodzi, że peer już przetworzył żądanie aplikacji.",
    ],
    transferTask:
      "Masz lokalny diagnostyczny protokół z pięciobajtowym hello i dalszą ramką. Opisz, kto zachowuje listener, kto jest właścicielem streamu po accept, które adresy logujesz oraz jak odczytasz hello bez konsumowania pierwszego bajtu ramki.",
    evidenceGate:
      "Gate connect sprawdza pełny preamble na kontrolowanym short-writerze i jego błąd, a na prawdziwym loopback zwraca stream dla suffixu, ack oraz endpointów. Blank accept rozróżnia EOF i zwraca stream do odczytu suffixu.",
    sourceIds: [
      "tokio-tcp-listener",
      "tokio-tcp-stream",
      "tokio-async-write-shutdown",
      "tokio-async-read-ext",
    ],
  },
  {
    id: "tokio-tcp-half-close",
    moduleId: "tokio-network-service",
    conceptIds: ["tokio-tcp-directional-shutdown"],
    competencyIds: ["close-one-tcp-direction"],
    prerequisites: ["tokio-tcp-connect"],
    title: "Zamknij tylko kierunek żądania",
    subtitle:
      "Wyślesz EOF po żądaniu, a nadal odbierzesz odpowiedź przez drugi kierunek tego samego TCP streamu.",
    minutes: 34,
    outcomes: [
      "Zasygnalizujesz serwerowi kompletne żądanie przez `shutdown` write half.",
      "Użyjesz owned read/write halves bez utraty możliwości czytania odpowiedzi.",
      "Odczytasz do umówionego EOF albo limitu bez zakładania granic pakietów i bez ukrywania I/O error.",
    ],
    steps: [
      choose(
        "tokio-tcp-half-close-predict",
        "predict",
        "Co widzi serwer po shutdown writer-a?",
        "Klient zapisał kompletne żądanie, awaituje `writer.shutdown()`, ale zatrzymuje swój `OwnedReadHalf`. Co może zrobić serwer?",
        0,
        [
          "Czytać żądanie do EOF, a potem wysłać odpowiedź; klient nadal może ją odczytać.",
          "Musi zamknąć całe połączenie, bo shutdown zawsze unieważnia oba halves.",
          "Musi czekać na drop reader-a klienta, zanim wolno mu zapisać odpowiedź.",
        ],
        [
          "Tak. EOF dotyczy kierunku client → server; odpowiedź server → client pozostaje otwarta.",
          "Cały TcpStream to dwa kierunki. Tutaj kończysz tylko lokalny output.",
          "Reader klienta jest właśnie miejscem, do którego serwer może teraz wysłać odpowiedź.",
        ],
      ),
      tokioRun(
        "tokio-tcp-half-close-run",
        "Uruchom request EOF i odpowiedź",
        "Uruchom przykład. Serwer nie tworzy odpowiedzi zanim `read_to_end` zobaczy EOF żądania. Client shutdown writer-a nie zamyka jego reader-a.",
        tcpHalfCloseRun,
        "request-eof=true\nreply=answer\n",
      ),
      choose(
        "tokio-tcp-half-close-explain",
        "explain",
        "Flush czy shutdown?",
        "Po zapisaniu ostatniego bajtu żądania serwer czeka na EOF, aby wiedzieć, że może rozpocząć odpowiedź. Która operacja daje ten sygnał?",
        1,
        [
          "`flush`, ponieważ każde opróżnienie bufora jest TCP FIN.",
          "`shutdown` na writerze, ponieważ kończy kierunek zapisu po wyniku I/O.",
          "`read` na lokalnym readerze, ponieważ peer wywnioskuje EOF z oczekiwania.",
        ],
        [
          "Flush może przenieść dane z buforów, ale future write nadal pozostaje możliwy.",
          "Tak. Obsłuż wynik shutdown; to decyzja protokołu, nie efekt uboczny zwykłego flush.",
          "Lokalne czytanie nie wysyła sygnału końca lokalnego outputu.",
        ],
      ),
      tokioExercise({
        id: "tokio-tcp-half-close-gate",
        kind: "modify",
        title: "Wyślij żądanie i czytaj po half-close",
        prompt:
          "Uzupełnij `request_then_reply`. Rozdziel `TcpStream` na owned halves, zapisz całe `request`, awaituj `shutdown` write half, a potem przeczytaj odpowiedź przez reader z limitem `max_reply`. Test serwera odpowiada dopiero po EOF żądania i dzieli odpowiedź na dwa write; wynik ma mieć wszystkie bytes albo `InvalidData` po wykryciu bajtu ponad limit. Po przekroczeniu limitu połączenie jest terminalne dla tej wymiany. Zachowaj pierwotny `io::Error` z write, shutdown lub read.",
        code: requestThenReplyStarter,
        solution: requestThenReplySolution,
        tests: requestThenReplyTests,
        hints: [
          "`into_split` przenosi własność do `OwnedReadHalf` i `OwnedWriteHalf`; writer może zakończyć się zanim rozpoczniesz read.",
          "`write_all(...).await?`, potem `writer.shutdown().await?`; dopiero potem zbieraj response z reader-a.",
        ],
        forbiddenPatterns: [".write(", "drop(writer)"],
        gate: true,
      }),
      tokioExercise({
        id: "tokio-tcp-half-close-blank",
        kind: "blank",
        title: "Od pustej kartki: odpowiedz dopiero po EOF",
        prompt:
          "Od pustej kartki napisz `reply_after_eof`. Funkcja przyjmuje stream, response i maksymalny rozmiar requestu; zwraca dokładne bytes requestu. Ma odpowiedzieć dopiero po EOF żądania. Request ponad limit zwraca `InvalidData` i nie wysyła response. Client po swoim shutdown nadal musi móc odebrać response. Nie używaj `read_exact` ani `read_to_end`.",
        solution: replyAfterEofSolution,
        tests: replyAfterEofTests,
        hints: [
          "`read == 0` jest tutaj granicą żądania. Każde dodatnie `n` dodaj tylko po sprawdzeniu miejsca w limicie.",
          "Zachowaj writer do końca odczytu; po pętli użyj `write_all(response).await?` i `shutdown().await?`.",
        ],
        forbiddenPatterns: [".read_exact(", ".read_to_end("],
        gate: true,
      }),
    ],
    misconceptions: [
      "Flush daje peer-owi EOF i zastępuje shutdown.",
      "Shutdown write half uniemożliwia lokalny read odpowiedzi.",
      "Dwa write requestu albo response muszą pojawić się jako dwa read po peer-a.",
      "Po I/O error można bezwarunkowo ponowić częściowo wysłane żądanie na tym samym streamie.",
    ],
    transferTask:
      "Projektujesz prosty upload: client kończy request EOF, serwer ma dopiero wtedy wyliczyć i odesłać podsumowanie. Wskaż właściciela obu halves, granicę maksymalnego requestu, moment odpowiedzi i co robisz z połączeniem po błędzie w niekompletnej wymianie.",
    evidenceGate:
      "Gate klienta dowodzi request EOF przed odpowiedzią, odbiera response z owned reader-a po shutdown owned writer-a i odrzuca limit+1. Blank serwera czyta bez założeń o chunkach, sprawdza limit, dopiero po EOF wysyła response i kończy własny output.",
    sourceIds: [
      "tokio-tcp-stream",
      "tokio-tcp-owned-write-half",
      "tokio-async-write-shutdown",
      "tokio-async-read-ext",
    ],
  },
];

export const tokioTcpReviewExercises: Record<string, LessonStep> = {
  "tokio-tcp-ownership": tokioExercise({
    id: "review-tokio-tcp-ownership",
    kind: "apply",
    title: "Powtórka: zachowaj accepted loopback stream",
    prompt:
      "Uzupełnij `validate_loopback_peer` i `accept_loopback`. Pierwsza funkcja ma odrzucić nie-loopback `SocketAddr` przez `PermissionDenied`; druga wywołuje tę politykę po accept i dla `127.0.0.1` zwraca posiadany `TcpStream` oraz adres peer-a. Test sprawdza politykę na publicznym adresie bez sieci, a potem używa zwróconego local streamu do późniejszej wiadomości i porównuje endpointy.",
    code: acceptLoopbackStarter,
    solution: acceptLoopbackSolution,
    tests: acceptLoopbackTests,
    hints: [
      "`SocketAddr::ip().is_loopback()` daje czystą, bezsieciową politykę do wywołania przed zwróceniem streamu.",
      "Po `listener.accept().await?` wywołaj walidator i zwróć `Ok((stream, peer))`; nie czytaj ani nie dropuj streamu w helperze.",
    ],
  }),
  "tokio-tcp-directional-shutdown": tokioExercise({
    id: "review-tokio-tcp-directional-shutdown",
    kind: "apply",
    title: "Powtórka: zakończ owned writer bez reader-a",
    prompt:
      "Uzupełnij `send_and_finish`. Funkcja dostaje `OwnedWriteHalf`: ma wysłać wszystkie bytes, awaitować explicit shutdown i zwrócić prawdziwy `io::Result`. Test zatrzymuje po stronie klienta OwnedReadHalf, a serwer odpowiada dopiero po EOF requestu. Reader klienta musi następnie odebrać pełne `pong`; nie dropuj ani nie twórz nowego połączenia.",
    code: finishWriterStarter,
    solution: finishWriterSolution,
    tests: finishWriterTests,
    hints: [
      "Writer jest już posiadany przez parametr, więc wystarczy oznaczyć go jako `mut`.",
      "Najpierw `write_all(bytes).await?`, następnie zwróć wynik `writer.shutdown().await` bez unwrap.",
    ],
  }),
};
