export const streamCapacityTestsStarter = String.raw`// Zadanie lokalne: zaprojektuj testy limitu K dla strumienia, ponowień,
// konfliktów i zmiany konfiguracji po ponownym otwarciu bazy.
// Dobierz własne API i granicę transakcji; ten plik nie dostarcza rozwiązania.
// Brak wykonywalnych testów oznacza brak dowodu spełnienia kontraktu.
`;

export const streamCapacityTests = String.raw`use std::fs;
use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ingest_core::{Disposition, Event, Level, Receipt};
use ingest_store::{Store, StoreError};
use rusqlite::Connection;

static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

struct Database {
    directory: PathBuf,
    path: PathBuf,
}

impl Database {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "ingest-stream-{label}-{}-{nonce}-{}",
            std::process::id(),
            NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("events.sqlite");
        Self { directory, path }
    }
}

impl Drop for Database {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.directory).unwrap();
    }
}

fn limited_store(path: &Path, global: usize, limit: usize) -> Store {
    Store::open_with_stream_limit(path, global, NonZeroUsize::new(limit).unwrap()).unwrap()
}

fn event(source: &str, key: &str, message: &str) -> Event {
    Event::new(
        source.to_owned(),
        key.to_owned(),
        Level::Info,
        message.to_owned(),
    )
    .unwrap()
}

type StoredRow = (i64, String, String, String, String, Option<String>);

fn rows(path: &Path) -> Vec<StoredRow> {
    let connection = Connection::open(path).unwrap();
    let mut statement = connection
        .prepare("SELECT sequence, source, request_key, level, message, correlation FROM events ORDER BY sequence")
        .unwrap();
    statement
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
}

fn assert_duplicate(store: &mut Store, original: &Event, sequence: u64) {
    assert_eq!(
        store.ingest(original).unwrap(),
        Receipt {
            sequence,
            disposition: Disposition::Duplicate
        }
    );
}

#[test]
fn global_only_constructor_keeps_existing_capacity_and_retry_contract() {
    let database = Database::new("global-only");
    let mut store = Store::open(&database.path, 2).unwrap();
    let first = event("one", "first", "message");
    let receipt = store.ingest(&first).unwrap();
    assert_eq!(receipt.sequence, 1);
    assert_eq!(
        store
            .ingest(&event("one", "second", "message"))
            .unwrap()
            .sequence,
        2
    );
    let before = rows(&database.path);
    assert_duplicate(&mut store, &first, 1);
    assert!(matches!(
        store.ingest(&event("one", "first", "changed")),
        Err(StoreError::Conflict)
    ));
    assert!(matches!(
        store.ingest(&event("two", "first", "message")),
        Err(StoreError::Full)
    ));
    assert_eq!(rows(&database.path), before);
}

#[test]
fn stream_capacity_k_one_preserves_retry_conflict_and_rejected_rows() {
    let database = Database::new("k-one");
    let mut store = limited_store(&database.path, 10, 1);
    let first = event("sensor", "key", "wiadomość 🙂")
        .with_correlation(Some("trace".to_owned()))
        .unwrap();
    assert_eq!(
        store.ingest(&first).unwrap(),
        Receipt {
            sequence: 1,
            disposition: Disposition::Inserted
        }
    );
    let before = rows(&database.path);
    assert_duplicate(&mut store, &first, 1);
    for changed in [
        event("sensor", "key", "changed")
            .with_correlation(Some("trace".to_owned()))
            .unwrap(),
        first
            .clone()
            .with_correlation(Some("other".to_owned()))
            .unwrap(),
        first.clone().with_correlation(None).unwrap(),
        Event::new(
            "sensor".to_owned(),
            "key".to_owned(),
            Level::Warn,
            "wiadomość 🙂".to_owned(),
        )
        .unwrap()
        .with_correlation(Some("trace".to_owned()))
        .unwrap(),
    ] {
        assert!(matches!(store.ingest(&changed), Err(StoreError::Conflict)));
    }
    assert!(matches!(
        store.ingest(&event("sensor", "new", "message")),
        Err(StoreError::Full)
    ));
    assert_eq!(store.count().unwrap(), 1);
    assert_eq!(rows(&database.path), before);
}

#[test]
fn stream_capacity_k_two_counts_each_source_independently() {
    let database = Database::new("independent");
    let mut store = limited_store(&database.path, 10, 2);
    for (source, key, sequence) in [
        ("one", "same", 1),
        ("one", "second", 2),
        ("two", "same", 3),
        ("two", "second", 4),
    ] {
        assert_eq!(
            store.ingest(&event(source, key, "message")).unwrap(),
            Receipt {
                sequence,
                disposition: Disposition::Inserted
            }
        );
    }
    let before = rows(&database.path);
    for (source, sequence) in [("one", 1), ("two", 3)] {
        assert_duplicate(&mut store, &event(source, "same", "message"), sequence);
        assert!(matches!(
            store.ingest(&event(source, "third", "message")),
            Err(StoreError::Full)
        ));
    }
    assert_eq!(store.count().unwrap(), 4);
    assert_eq!(rows(&database.path), before);
}

#[test]
fn stream_capacity_never_expands_the_global_bound() {
    let database = Database::new("global-bound");
    let mut store = limited_store(&database.path, 1, 2);
    let first = event("one", "key", "message");
    store.ingest(&first).unwrap();
    let before = rows(&database.path);
    assert!(matches!(
        store.ingest(&event("two", "key", "message")),
        Err(StoreError::Full)
    ));
    assert_duplicate(&mut store, &first, 1);
    assert!(matches!(
        store.ingest(&event("one", "key", "changed")),
        Err(StoreError::Conflict)
    ));
    assert_eq!(rows(&database.path), before);
}

#[test]
fn stream_capacity_same_limit_reopen_uses_committed_occupancy() {
    let database = Database::new("reopen");
    let first = event("one", "key", "message");
    {
        let mut store = limited_store(&database.path, 10, 1);
        store.ingest(&first).unwrap();
    }
    let before = rows(&database.path);
    let mut reopened = limited_store(&database.path, 10, 1);
    assert_duplicate(&mut reopened, &first, 1);
    assert!(matches!(
        reopened.ingest(&event("one", "key", "changed")),
        Err(StoreError::Conflict)
    ));
    assert!(matches!(
        reopened.ingest(&event("one", "new", "message")),
        Err(StoreError::Full)
    ));
    assert_eq!(rows(&database.path), before);
}

#[test]
fn stream_capacity_lower_then_raise_preserves_rows_and_original_receipts() {
    let database = Database::new("reconfigure");
    {
        let mut store = limited_store(&database.path, 10, 2);
        for (source, key, sequence) in [
            ("one", "first", 1),
            ("one", "second", 2),
            ("two", "first", 3),
            ("two", "second", 4),
        ] {
            assert_eq!(
                store
                    .ingest(
                        &event(source, key, "message")
                            .with_correlation(Some("trace".to_owned()))
                            .unwrap(),
                    )
                    .unwrap()
                    .sequence,
                sequence
            );
        }
    }
    let original_rows = rows(&database.path);
    {
        let mut lowered = limited_store(&database.path, 10, 1);
        assert_eq!(lowered.count().unwrap(), 4);
        assert_eq!(rows(&database.path), original_rows);
        for (source, key, sequence) in [
            ("one", "first", 1),
            ("one", "second", 2),
            ("two", "first", 3),
            ("two", "second", 4),
        ] {
            let original = event(source, key, "message")
                .with_correlation(Some("trace".to_owned()))
                .unwrap();
            assert_duplicate(&mut lowered, &original, sequence);
            assert!(matches!(
                lowered.ingest(
                    &event(source, key, "changed")
                        .with_correlation(Some("trace".to_owned()))
                        .unwrap()
                ),
                Err(StoreError::Conflict)
            ));
        }
        let changed_correlation = event("one", "first", "message")
            .with_correlation(Some("other-trace".to_owned()))
            .unwrap();
        assert!(matches!(
            lowered.ingest(&changed_correlation),
            Err(StoreError::Conflict)
        ));
        assert_eq!(lowered.count().unwrap(), 4);
        for source in ["one", "two"] {
            assert!(matches!(
                lowered.ingest(&event(source, "third", "message")),
                Err(StoreError::Full)
            ));
        }
        assert_eq!(rows(&database.path), original_rows);
    }
    let mut raised = limited_store(&database.path, 10, 3);
    for (source, sequence) in [("one", 5), ("two", 6)] {
        let third = event(source, "third", "message");
        assert_eq!(
            raised.ingest(&third).unwrap(),
            Receipt {
                sequence,
                disposition: Disposition::Inserted
            }
        );
        assert_duplicate(&mut raised, &third, sequence);
        assert!(matches!(
            raised.ingest(&event(source, "fourth", "message")),
            Err(StoreError::Full)
        ));
    }
    let final_rows = rows(&database.path);
    assert_eq!(&final_rows[..4], original_rows.as_slice());
    assert_eq!(raised.count().unwrap(), 6);
    assert_duplicate(
        &mut raised,
        &event("one", "first", "message")
            .with_correlation(Some("trace".to_owned()))
            .unwrap(),
        1,
    );
    assert_duplicate(
        &mut raised,
        &event("two", "first", "message")
            .with_correlation(Some("trace".to_owned()))
            .unwrap(),
        3,
    );
    assert_eq!(rows(&database.path), final_rows);
}

#[test]
fn stream_capacity_busy_failure_preserves_rows_and_capacity() {
    let database = Database::new("busy");
    let mut store = limited_store(&database.path, 10, 1);
    let lock = Connection::open(&database.path).unwrap();
    lock.busy_timeout(Duration::from_millis(0)).unwrap();
    lock.execute_batch("BEGIN IMMEDIATE").unwrap();
    let first = event("one", "key", "message");
    assert!(matches!(store.ingest(&first), Err(StoreError::Busy)));
    assert_eq!(store.count().unwrap(), 0);
    assert!(rows(&database.path).is_empty());
    lock.execute_batch("ROLLBACK").unwrap();
    assert_eq!(
        store.ingest(&first).unwrap(),
        Receipt {
            sequence: 1,
            disposition: Disposition::Inserted
        }
    );
    assert!(matches!(
        store.ingest(&event("one", "new", "message")),
        Err(StoreError::Full)
    ));
    assert_eq!(store.count().unwrap(), 1);
}
`;
