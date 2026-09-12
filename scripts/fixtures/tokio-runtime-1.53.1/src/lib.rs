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
}
