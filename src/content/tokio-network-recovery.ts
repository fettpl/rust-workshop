import { tokioExercise } from "./tokio-helpers";

export const ownedFrameDiscardTransfer = tokioExercise({
  id: "tokio-frame-deadlines-owned-discard-transfer",
  kind: "apply",
  title: "Oddaj połączenie tylko po kompletnej ramce",
  prompt:
    "Napisz receive_frame_or_discard(stream: TcpStream, limit: u16, deadline: Instant) -> Result<(TcpStream, Vec<u8>), ReceiveError>. Posiadasz połączenie: sukces ma oddać ten sam nadal używalny stream i całe body ramki [u16 big-endian][body]. Zdefiniuj ReceiveError z Timeout, TooLarge oraz Io(io::Error). Jeden absolutny deadline obejmuje header i body. Długość ponad limit odrzuć przed alokacją body; niepełny header, body i EOF przed headerem dają Io z UnexpectedEof. Każdy błąd kończy własność streamu w tej funkcji: peer musi zobaczyć EOF, a caller nie otrzymuje częściowego połączenia do retry. Pusta ramka jest poprawna. Nie spawnuj odłączonego czytnika, nie odnawiaj deadline i nie czytaj suffixu kolejnej wymiany. To kontrakt własności całego połączenia, odrębny od helpera pożyczającego czytnik.",
  code: `use tokio::{io, net::TcpStream, time::Instant};
#[derive(Debug)]
pub enum ReceiveError { Timeout, TooLarge, Io(io::Error) }
pub async fn receive_frame_or_discard(_stream: TcpStream, _limit: u16, _deadline: Instant) -> Result<(TcpStream, Vec<u8>), ReceiveError> {
    todo!("oddaj stream wyłącznie po kompletnej ramce")
}`,
  solution: `use tokio::{io::{self, AsyncReadExt}, net::TcpStream, time::{Instant, timeout_at}};
#[derive(Debug)]
pub enum ReceiveError { Timeout, TooLarge, Io(io::Error) }
pub async fn receive_frame_or_discard(mut stream: TcpStream, limit: u16, deadline: Instant) -> Result<(TcpStream, Vec<u8>), ReceiveError> {
    let body = timeout_at(deadline, async {
        let mut header = [0; 2];
        stream.read_exact(&mut header).await.map_err(ReceiveError::Io)?;
        let length = u16::from_be_bytes(header);
        if length > limit { return Err(ReceiveError::TooLarge); }
        let mut body = vec![0; usize::from(length)];
        stream.read_exact(&mut body).await.map_err(ReceiveError::Io)?;
        Ok(body)
    }).await.map_err(|_| ReceiveError::Timeout)??;
    Ok((stream, body))
}`,
  tests: `use tokio::{io::{AsyncReadExt, AsyncWriteExt}, net::{TcpListener, TcpStream}, time::{Duration, Instant}};
async fn pair() -> (TcpStream, TcpStream) {
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).await.unwrap();
    let client = TcpStream::connect(listener.local_addr().unwrap());
    let (client, accepted) = tokio::join!(client, listener.accept());
    (client.unwrap(), accepted.unwrap().0)
}
#[tokio::test(flavor="current_thread")]
async fn complete_frame_returns_same_connection_without_consuming_suffix() {
    let (client, mut peer) = pair().await;
    peer.write_all(&[0, 3, 0, 255, 42, 99]).await.unwrap();
    let (mut client, body) = receive_frame_or_discard(client, 3, Instant::now()+Duration::from_secs(2)).await.unwrap();
    assert_eq!(body, vec![0,255,42]);
    let mut suffix=[0]; client.read_exact(&mut suffix).await.unwrap(); assert_eq!(suffix,[99]);
    client.write_all(b"ack").await.unwrap();
    let mut ack=[0;3]; peer.read_exact(&mut ack).await.unwrap(); assert_eq!(&ack,b"ack");
}
#[tokio::test(flavor="current_thread")]
async fn empty_frame_is_valid() {
    let (client, mut peer) = pair().await;
    peer.write_all(&[0,0]).await.unwrap();
    let (_client, body) = receive_frame_or_discard(client, 0, Instant::now()+Duration::from_secs(2)).await.unwrap();
    assert!(body.is_empty());
}
#[tokio::test(flavor="current_thread")]
async fn timeout_discards_owned_connection() {
    let (client, mut peer) = pair().await;
    assert!(matches!(receive_frame_or_discard(client, 32, Instant::now()).await, Err(ReceiveError::Timeout)));
    let mut byte=[0]; assert_eq!(peer.read(&mut byte).await.unwrap(),0);
}
#[tokio::test(flavor="current_thread")]
async fn oversize_header_discards_before_waiting_for_body() {
    let (client, mut peer) = pair().await;
    peer.write_all(&[1,0]).await.unwrap();
    assert!(matches!(receive_frame_or_discard(client, 255, Instant::now()+Duration::from_secs(2)).await, Err(ReceiveError::TooLarge)));
    let mut byte=[0]; assert_eq!(peer.read(&mut byte).await.unwrap(),0);
}
#[tokio::test(flavor="current_thread")]
async fn all_incomplete_frames_are_io_errors_and_discard_connection() {
    for prefix in [&[][..], &[0][..], &[0,2,42][..]] {
        let (client, mut peer) = pair().await;
        peer.write_all(prefix).await.unwrap(); peer.shutdown().await.unwrap();
        match receive_frame_or_discard(client, 32, Instant::now()+Duration::from_secs(2)).await {
            Err(ReceiveError::Io(error)) => assert_eq!(error.kind(),std::io::ErrorKind::UnexpectedEof),
            other => panic!("expected original IO EOF, got {other:?}"),
        }
        let mut byte=[0]; assert_eq!(peer.read(&mut byte).await.unwrap(),0);
    }
}
#[tokio::test(flavor="current_thread")]
async fn delayed_header_does_not_renew_the_body_deadline_and_timeout_discards() {
    use std::{future::Future, pin::Pin, sync::Arc, task::{Context, Poll, Wake, Waker}};
    struct Quiet;
    impl Wake for Quiet { fn wake(self: Arc<Self>) {} }
    fn poll_once<F: Future>(future: Pin<&mut F>) -> Poll<F::Output> {
        let waker = Waker::from(Arc::new(Quiet));
        future.poll(&mut Context::from_waker(&waker))
    }
    let (client, mut peer) = pair().await;
    peer.writable().await.unwrap();
    let socket = client.into_std().unwrap();
    // The observer never reads bytes; peek confirms actual header progress.
    let observer = socket.try_clone().unwrap();
    let client = TcpStream::from_std(socket).unwrap();
    tokio::time::pause();
    let started = Instant::now();
    let mut receiving = Box::pin(receive_frame_or_discard(client, 1, started + Duration::from_secs(10)));
    assert!(poll_once(receiving.as_mut()).is_pending());
    tokio::time::advance(Duration::from_secs(6)).await;
    assert_eq!(peer.try_write(&[0,1]).unwrap(), 2);
    let mut header = [0;2];
    let mut arrived = false;
    for _ in 0..128 {
        match observer.peek(&mut header) {
            Ok(2) => { arrived = true; break; }
            Ok(_) => {},
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {},
            Err(error) => panic!("header arrival probe: {error}"),
        }
        tokio::task::yield_now().await;
    }
    assert!(arrived, "loopback header did not arrive");
    let mut consumed = false;
    for _ in 0..128 {
        assert!(poll_once(receiving.as_mut()).is_pending());
        match observer.peek(&mut header) {
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => { consumed = true; break; }
            Ok(_) => {},
            Err(error) => panic!("header consumption probe: {error}"),
        }
        tokio::task::yield_now().await;
    }
    assert!(consumed, "the complete header must be consumed before the body deadline check");
    assert_eq!(Instant::now() - started, Duration::from_secs(6));
    // The duplicate must not keep the connection alive during the disposal check.
    drop(observer);
    // Cross the timer wheel boundary by one millisecond, far below a renewed budget.
    tokio::time::advance(Duration::from_millis(4001)).await;
    let result = poll_once(receiving.as_mut());
    assert!(matches!(result, Poll::Ready(Err(ReceiveError::Timeout))), "WHOLE_FRAME_DEADLINE: body must expire at the original deadline, after delayed header");
    drop(result);
    assert_eq!(Instant::now() - started, Duration::from_millis(10001));
    let mut byte = [0];
    assert_eq!(peer.read(&mut byte).await.unwrap(), 0, "timeout must dispose the owned TCP connection");
}`,
  hints: [
    "W jednym timeout_at pożycz posiadany stream do odczytu headera i body. Wynik operacji to samo body; stream nadal należy do funkcji.",
    "Przenieś stream do Ok dopiero po obu sukcesach. Każdy ? na wcześniejszym Err opuszcza funkcję i upuszcza stream.",
  ],
  forbiddenPatterns: ["tokio::spawn", "std::mem::forget", "timeout(Duration"],
  gate: true,
});
