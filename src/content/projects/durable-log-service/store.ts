import type { ProjectPackage } from "../../../domain/types";

export const storeManifest = String.raw`[package]
name = "ingest-store"
version = "1.0.0"
edition = "2024"
rust-version = "1.85.0"
publish = false

[dependencies]
ingest-core = { path = "../ingest-core" }
rusqlite = { version = "=0.40.2", default-features = false, features = ["bundled"] }

[lints.rust]
unsafe_code = "forbid"
`;

const storeLib = String.raw`#![forbid(unsafe_code)]

mod store;

pub use store::{Store, StoreError};
`;

const storeStarter = String.raw`#![forbid(unsafe_code)]

use std::path::Path;

use ingest_core::{Event, Receipt};
use rusqlite::Connection;

const SCHEMA_VERSION: u32 = 2;

#[derive(Debug)]
pub enum StoreError {
    Conflict,
    Full,
    Busy,
    UnsupportedSchema(u32),
    Storage(rusqlite::Error),
}

pub struct Store {
    connection: Connection,
    max_events: usize,
}

impl Store {
    pub fn open(_path: &Path, _max_events: usize) -> Result<Self, StoreError> {
        todo!("otwórz i zmigruj magazyn SQLite")
    }

    pub fn ingest(&mut self, _event: &Event) -> Result<Receipt, StoreError> {
        todo!("zapisz zdarzenie w transakcji")
    }

    pub fn count(&self) -> Result<u64, StoreError> {
        todo!("policz zdarzenia")
    }
}
`;

const storeSolution = String.raw`#![forbid(unsafe_code)]

use std::error::Error;
use std::fmt;
use std::path::Path;
use std::time::Duration;

#[cfg(test)]
use std::sync::Mutex;

use ingest_core::{Disposition, Event, Level, Receipt};
use rusqlite::{
    Connection, ErrorCode, OptionalExtension, Transaction, TransactionBehavior, params,
};

const SCHEMA_VERSION: u32 = 2;

const BUSY_TIMEOUT: Duration = Duration::from_millis(250);

#[derive(Debug)]
pub enum StoreError {
    Conflict,
    Full,
    Busy,
    UnsupportedSchema(u32),
    Storage(rusqlite::Error),
}

impl fmt::Display for StoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Conflict => formatter.write_str("zdarzenie ma inną treść"),
            Self::Full => formatter.write_str("magazyn osiągnął limit zdarzeń"),
            Self::Busy => formatter.write_str("magazyn SQLite jest zajęty"),
            Self::UnsupportedSchema(version) => {
                write!(formatter, "nieobsługiwana wersja schematu: {version}")
            }
            Self::Storage(error) => write!(formatter, "błąd SQLite: {error}"),
        }
    }
}

impl Error for StoreError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Storage(error) => Some(error),
            _ => None,
        }
    }
}

pub struct Store {
    connection: Connection,
    max_events: usize,
}

fn map_sqlite_error(error: rusqlite::Error) -> StoreError {
    match error.sqlite_error_code() {
        Some(ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked) => StoreError::Busy,
        _ => StoreError::Storage(error),
    }
}

fn invalid_pragma() -> StoreError {
    StoreError::Storage(rusqlite::Error::InvalidQuery)
}

fn level_text(level: Level) -> &'static str {
    match level {
        Level::Info => "INFO",
        Level::Warn => "WARN",
        Level::Error => "ERROR",
    }
}

fn initialize(connection: &mut Connection) -> Result<(), StoreError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite_error)?;
    transaction
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS events (\
                sequence INTEGER PRIMARY KEY,\
                source TEXT NOT NULL,\
                request_key TEXT NOT NULL,\
                level TEXT NOT NULL,\
                message TEXT NOT NULL,\
                correlation TEXT,\
                UNIQUE(source, request_key)\
            ); PRAGMA user_version = 2;",
        )
        .map_err(map_sqlite_error)?;
    complete_transaction(transaction).map_err(map_sqlite_error)
}

fn migrate_v1(connection: &mut Connection) -> Result<(), StoreError> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(map_sqlite_error)?;
    transaction
        .execute("ALTER TABLE events ADD COLUMN correlation TEXT", [])
        .map_err(map_sqlite_error)?;
    transaction
        .execute_batch("PRAGMA user_version = 2;")
        .map_err(map_sqlite_error)?;
    complete_transaction(transaction).map_err(map_sqlite_error)
}

fn configure(connection: &mut Connection) -> Result<(), StoreError> {
    connection
        .busy_timeout(BUSY_TIMEOUT)
        .map_err(map_sqlite_error)?;
    let journal_mode: String = connection
        .pragma_update_and_check(None, "journal_mode", "WAL", |row| row.get(0))
        .map_err(map_sqlite_error)?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(invalid_pragma());
    }
    connection
        .pragma_update(None, "synchronous", "FULL")
        .map_err(map_sqlite_error)?;
    let synchronous: i64 = connection
        .query_row("PRAGMA synchronous", [], |row| row.get(0))
        .map_err(map_sqlite_error)?;
    if synchronous != 2 {
        return Err(invalid_pragma());
    }
    let busy_timeout: i64 = connection
        .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
        .map_err(map_sqlite_error)?;
    if busy_timeout <= 0 {
        return Err(invalid_pragma());
    }
    Ok(())
}

#[cfg(test)]
static FAIL_NEXT_COMMIT: Mutex<bool> = Mutex::new(false);

fn complete_transaction(transaction: Transaction<'_>) -> Result<(), rusqlite::Error> {
    #[cfg(test)]
    {
        let should_fail = {
            let mut flag = FAIL_NEXT_COMMIT.lock().expect("commit seam mutex");
            let value = *flag;
            *flag = false;
            value
        };
        if should_fail {
            transaction.rollback()?;
            return Err(rusqlite::Error::InvalidQuery);
        }
    }
    transaction.commit()
}

impl Store {
    pub fn open(path: &Path, max_events: usize) -> Result<Self, StoreError> {
        let mut connection = Connection::open(path).map_err(map_sqlite_error)?;
        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(map_sqlite_error)?;
        if version > SCHEMA_VERSION {
            return Err(StoreError::UnsupportedSchema(version));
        }
        configure(&mut connection)?;
        match version {
            0 => initialize(&mut connection)?,
            1 => migrate_v1(&mut connection)?,
            2 => {}
            _ => unreachable!("versions above the supported schema were rejected"),
        }
        Ok(Self {
            connection,
            max_events,
        })
    }

    pub fn ingest(&mut self, event: &Event) -> Result<Receipt, StoreError> {
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(map_sqlite_error)?;
        let prior = transaction
            .query_row(
                "SELECT sequence, level, message, correlation FROM events WHERE source = ?1 AND request_key = ?2",
                params![event.source(), event.key()],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                    ))
                },
            )
            .optional()
            .map_err(map_sqlite_error)?;

        let receipt = if let Some((sequence, level, message, correlation)) = prior {
            let same = level == level_text(event.level())
                && message == event.message()
                && correlation.as_deref() == event.correlation();
            if !same {
                return Err(StoreError::Conflict);
            }
            Receipt {
                sequence: u64::try_from(sequence).map_err(|_| invalid_pragma())?,
                disposition: Disposition::Duplicate,
            }
        } else {
            let count: i64 = transaction
                .query_row("SELECT count(*) FROM events", [], |row| row.get(0))
                .map_err(map_sqlite_error)?;
            if count < 0 || count as usize >= self.max_events {
                return Err(StoreError::Full);
            }
            transaction
                .execute(
                    "INSERT INTO events(source, request_key, level, message, correlation) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        event.source(),
                        event.key(),
                        level_text(event.level()),
                        event.message(),
                        event.correlation(),
                    ],
                )
                .map_err(map_sqlite_error)?;
            Receipt {
                sequence: u64::try_from(transaction.last_insert_rowid())
                    .map_err(|_| invalid_pragma())?,
                disposition: Disposition::Inserted,
            }
        };
        complete_transaction(transaction).map_err(map_sqlite_error)?;
        Ok(receipt)
    }

    pub fn count(&self) -> Result<u64, StoreError> {
        let count: i64 = self
            .connection
            .query_row("SELECT count(*) FROM events", [], |row| row.get(0))
            .map_err(map_sqlite_error)?;
        u64::try_from(count).map_err(|_| invalid_pragma())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_path() -> (std::path::PathBuf, std::path::PathBuf) {
        let directory = std::env::temp_dir().join(format!(
            "ingest-store-seam-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock after epoch")
                .as_nanos()
        ));
        fs::create_dir_all(&directory).expect("temporary directory");
        let path = directory.join("events.sqlite");
        (directory, path)
    }

    #[test]
    fn failed_commit_never_returns_a_success_receipt() {
        let (directory, path) = temporary_path();
        let mut store = Store::open(&path, 10).expect("store");
        *FAIL_NEXT_COMMIT.lock().expect("commit seam mutex") = true;
        assert!(matches!(
            store.ingest(
                &Event::new(
                    "source".to_owned(),
                    "key".to_owned(),
                    Level::Info,
                    "message".to_owned(),
                )
                .expect("event")
            ),
            Err(StoreError::Storage(_))
        ));
        assert_eq!(store.count().expect("count"), 0);
        fs::remove_dir_all(directory).expect("cleanup");
    }
}
`;

const transactionTests = String.raw`use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ingest_core::{Disposition, Event, Level};
use ingest_store::{Store, StoreError};
use rusqlite::Connection;

static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

fn temp_database(label: &str) -> (PathBuf, PathBuf) {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let directory = std::env::temp_dir().join(format!(
        "ingest-store-{label}-{}-{nonce}-{}",
        std::process::id(),
        NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir_all(&directory).unwrap();
    let path = directory.join("events.sqlite");
    (directory, path)
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

#[test]
fn first_insert_returns_sequence_and_inserted() {
    let (directory, path) = temp_database("first");
    let mut store = Store::open(&path, 10).unwrap();
    let receipt = store.ingest(&event("source", "key", "message")).unwrap();
    assert_eq!(receipt.sequence, 1);
    assert_eq!(receipt.disposition, Disposition::Inserted);
    assert_eq!(store.count().unwrap(), 1);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn equal_replay_returns_original_receipt() {
    let (directory, path) = temp_database("duplicate");
    let mut store = Store::open(&path, 10).unwrap();
    let first = store.ingest(&event("source", "key", "message")).unwrap();
    let second = store.ingest(&event("source", "key", "message")).unwrap();
    assert_eq!(second.sequence, first.sequence);
    assert_eq!(second.disposition, Disposition::Duplicate);
    assert_eq!(store.count().unwrap(), 1);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn changed_payload_is_a_conflict_without_modification() {
    let (directory, path) = temp_database("conflict");
    let mut store = Store::open(&path, 10).unwrap();
    let first = store.ingest(&event("source", "key", "message")).unwrap();
    assert!(matches!(
        store.ingest(&event("source", "key", "changed")),
        Err(StoreError::Conflict)
    ));
    assert_eq!(store.count().unwrap(), 1);
    assert_eq!(
        store
            .ingest(&event("source", "key", "message"))
            .unwrap()
            .sequence,
        first.sequence
    );
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn same_key_from_different_source_is_independent() {
    let (directory, path) = temp_database("sources");
    let mut store = Store::open(&path, 10).unwrap();
    let first = store.ingest(&event("one", "same", "message")).unwrap();
    let second = store.ingest(&event("two", "same", "message")).unwrap();
    assert_eq!(first.disposition, Disposition::Inserted);
    assert_eq!(second.disposition, Disposition::Inserted);
    assert_eq!(store.count().unwrap(), 2);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn utf8_and_receipt_survive_reopen() {
    let (directory, path) = temp_database("reopen");
    let first = {
        let mut store = Store::open(&path, 10).unwrap();
        store
            .ingest(&event("source", "key", "wiadomość 🙂"))
            .unwrap()
    };
    let mut reopened = Store::open(&path, 10).unwrap();
    let replay = reopened
        .ingest(&event("source", "key", "wiadomość 🙂"))
        .unwrap();
    assert_eq!(replay.sequence, first.sequence);
    assert_eq!(replay.disposition, Disposition::Duplicate);
    assert_eq!(reopened.count().unwrap(), 1);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn full_store_rejects_new_keys_but_accepts_duplicate() {
    let (directory, path) = temp_database("full");
    let mut store = Store::open(&path, 1).unwrap();
    let first = event("source", "key", "message");
    let receipt = store.ingest(&first).unwrap();
    assert!(matches!(
        store.ingest(&event("source", "other", "message")),
        Err(StoreError::Full)
    ));
    assert_eq!(store.ingest(&first).unwrap().sequence, receipt.sequence);
    assert_eq!(store.count().unwrap(), 1);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn lock_contention_is_reported_as_busy() {
    let (directory, path) = temp_database("busy");
    let mut store = Store::open(&path, 10).unwrap();
    let lock = Connection::open(&path).unwrap();
    lock.busy_timeout(Duration::from_millis(0)).unwrap();
    lock.execute_batch("BEGIN EXCLUSIVE").unwrap();
    assert!(matches!(
        store.ingest(&event("source", "key", "message")),
        Err(StoreError::Busy)
    ));
    lock.execute_batch("ROLLBACK").unwrap();
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn both_correlation_values_participate_in_conflict_checking() {
    let (directory, path) = temp_database("correlation");
    let mut store = Store::open(&path, 10).unwrap();
    let no_correlation = event("source", "key", "message");
    let with_correlation = no_correlation
        .clone()
        .with_correlation(Some("trace".to_owned()))
        .unwrap();
    let first = store.ingest(&no_correlation).unwrap();
    assert!(matches!(
        store.ingest(&with_correlation),
        Err(StoreError::Conflict)
    ));
    assert_eq!(
        store.ingest(&no_correlation).unwrap().sequence,
        first.sequence
    );
    let correlated = event("source", "correlated", "message")
        .with_correlation(Some("trace".to_owned()))
        .unwrap();
    let changed_correlation = event("source", "correlated", "message")
        .with_correlation(Some("other-trace".to_owned()))
        .unwrap();
    let correlated_receipt = store.ingest(&correlated).unwrap();
    assert!(matches!(
        store.ingest(&changed_correlation),
        Err(StoreError::Conflict)
    ));
    assert_eq!(
        store.ingest(&correlated).unwrap().sequence,
        correlated_receipt.sequence
    );
    fs::remove_dir_all(directory).unwrap();
}
`;

const transactionTestsStarter = String.raw`#[test]
#[ignore = "Kontrakt transakcji zostanie zaimplementowany w zadaniu 2."]
fn storage_contract_is_implemented_in_task_two() {}
`;

const migrationTests = String.raw`use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use ingest_store::{Store, StoreError};
use rusqlite::{Connection, params};

static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

fn temp_database(label: &str) -> (PathBuf, PathBuf) {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let directory = std::env::temp_dir().join(format!(
        "ingest-store-migration-{label}-{}-{nonce}-{}",
        std::process::id(),
        NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir_all(&directory).unwrap();
    let path = directory.join("events.sqlite");
    (directory, path)
}

fn create_v1(path: &std::path::Path, incompatible: bool) -> Connection {
    let connection = Connection::open(path).unwrap();
    let correlation = if incompatible {
        ", correlation TEXT"
    } else {
        ""
    };
    connection
        .execute_batch(&format!(
            "CREATE TABLE events (sequence INTEGER PRIMARY KEY, source TEXT NOT NULL, request_key TEXT NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL{correlation}, UNIQUE(source, request_key)); PRAGMA user_version=1;"
        ))
        .unwrap();
    connection
}

#[test]
fn empty_database_initializes_directly_to_v2_and_v1_migrates() {
    let (directory, path) = temp_database("success");
    let v1 = create_v1(&path, false);
    v1.execute(
        "INSERT INTO events(source, request_key, level, message) VALUES (?1, ?2, ?3, ?4)",
        params!["source", "key", "INFO", "message"],
    )
    .unwrap();
    drop(v1);
    let store = Store::open(&path, 10).unwrap();
    assert_eq!(store.count().unwrap(), 1);
    drop(store);
    let reopened = Connection::open(&path).unwrap();
    assert_eq!(
        reopened
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        2
    );
    assert_eq!(
        reopened
            .query_row("SELECT correlation FROM events", [], |row| {
                row.get::<_, Option<String>>(0)
            })
            .unwrap(),
        None
    );
    drop(reopened);

    let (empty_directory, empty_path) = temp_database("empty");
    let empty = Store::open(&empty_path, 10).unwrap();
    assert_eq!(empty.count().unwrap(), 0);
    drop(empty);
    let empty_connection = Connection::open(&empty_path).unwrap();
    assert_eq!(
        empty_connection
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        2
    );
    drop(empty_connection);
    fs::remove_dir_all(directory).unwrap();
    fs::remove_dir_all(empty_directory).unwrap();
}

#[test]
fn incompatible_v1_migration_rolls_back_marker_and_rows() {
    let (directory, path) = temp_database("rollback");
    let connection = create_v1(&path, true);
    connection
        .execute(
            "INSERT INTO events(source, request_key, level, message, correlation) VALUES (?1, ?2, ?3, ?4, ?5)",
            params!["source", "key", "INFO", "message", "trace"],
        )
        .unwrap();
    drop(connection);
    assert!(matches!(
        Store::open(&path, 10),
        Err(StoreError::Storage(_))
    ));
    let unchanged = Connection::open(&path).unwrap();
    assert_eq!(
        unchanged
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        unchanged
            .query_row("SELECT count(*) FROM events", [], |row| {
                row.get::<_, i64>(0)
            })
            .unwrap(),
        1
    );
    assert_eq!(
        unchanged
            .query_row("SELECT correlation FROM events", [], |row| {
                row.get::<_, String>(0)
            })
            .unwrap(),
        "trace"
    );
    drop(unchanged);
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn newer_schema_is_rejected_without_modification() {
    let (directory, path) = temp_database("newer");
    let connection = Connection::open(&path).unwrap();
    connection.execute_batch("PRAGMA user_version=3").unwrap();
    drop(connection);
    assert!(matches!(
        Store::open(&path, 10),
        Err(StoreError::UnsupportedSchema(3))
    ));
    let unchanged = Connection::open(&path).unwrap();
    assert_eq!(
        unchanged
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        3
    );
    assert!(matches!(
        unchanged.query_row("SELECT count(*) FROM events", [], |row| {
            row.get::<_, i64>(0)
        }),
        Err(rusqlite::Error::SqliteFailure(_, _))
    ));
    drop(unchanged);
    fs::remove_dir_all(directory).unwrap();
}
`;

const migrationTestsStarter = String.raw`#[test]
#[ignore = "Kontrakt migracji zostanie zaimplementowany w zadaniu 2."]
fn migration_contract_is_implemented_in_task_two() {}
`;

export const ingestStoreFiles: ProjectPackage["files"] = [
  {
    path: "crates/ingest-store/Cargo.toml",
    starter: storeManifest,
    solution: storeManifest,
  },
  {
    path: "crates/ingest-store/src/lib.rs",
    starter: storeLib,
    solution: storeLib,
  },
  {
    path: "crates/ingest-store/src/store.rs",
    starter: storeStarter,
    solution: storeSolution,
  },
  {
    path: "crates/ingest-store/tests/transactions.rs",
    starter: transactionTestsStarter,
    solution: transactionTests,
  },
  {
    path: "crates/ingest-store/tests/migrations.rs",
    starter: migrationTestsStarter,
    solution: migrationTests,
  },
];
