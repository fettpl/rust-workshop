// Replaced only in a fresh temporary copy by the authoring verifier.
#[cfg(test)]
mod tests {
    #[test]
    fn pinned_runtime_drives_and_joins_a_task() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        let result = runtime.block_on(async { tokio::spawn(async { 17 }).await.unwrap() });
        assert_eq!(result, 17);
    }

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn pinned_test_clock_drives_a_real_tokio_timeout() {
        let start = tokio::time::Instant::now();
        let deadline = std::time::Duration::from_secs(7);
        let result = tokio::time::timeout(deadline, std::future::pending::<()>()).await;
        assert!(result.is_err());
        assert_eq!(start.elapsed(), deadline);
    }

    #[tokio::test(flavor = "current_thread")]
    async fn pinned_io_handles_payload_larger_than_duplex_capacity() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let (mut writer, mut reader) = tokio::io::duplex(2);
        let send = async {
            writer.write_all(b"framed bytes").await.unwrap();
            writer.shutdown().await.unwrap();
        };
        let receive = async {
            let mut bytes = Vec::new();
            reader.read_to_end(&mut bytes).await.unwrap();
            bytes
        };
        let ((), bytes) = tokio::join!(send, receive);
        assert_eq!(bytes, b"framed bytes");
    }

    #[tokio::test(flavor = "current_thread")]
    async fn pinned_receiver_stream_drains_a_permit_after_close() {
        use tokio_stream::{StreamExt, wrappers::ReceiverStream};
        let (sender, receiver) = tokio::sync::mpsc::channel(2);
        sender.send(String::from("buffered")).await.unwrap();
        let permit = sender.reserve().await.unwrap();
        let mut stream = ReceiverStream::new(receiver);
        stream.close();
        assert!(sender.is_closed());
        permit.send(String::from("reserved"));
        assert_eq!(stream.next().await.as_deref(), Some("buffered"));
        assert_eq!(stream.next().await.as_deref(), Some("reserved"));
        assert_eq!(stream.next().await, None);
    }
}
