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
}
