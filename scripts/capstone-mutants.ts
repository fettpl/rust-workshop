import assert from "node:assert/strict";

export interface CapstoneMutant {
  id: string;
  path: string;
  namedTest: string;
  mutate(source: string): string;
}

function replaceOnce(source: string, before: string, after: string, id: string): string {
  assert(source.includes(before), `${id}: mutation target is absent`);
  return source.replace(before, after);
}

/**
 * Negative controls for the reviewed durable-log-service solution archive.
 * Each mutation has one exact behavior test and is applied to a fresh extraction.
 */
export const capstoneMutants: readonly CapstoneMutant[] = [
  {
    id: "changed-payload-accepted-as-duplicate",
    path: "crates/ingest-store/src/store.rs",
    namedTest: "changed_payload_is_a_conflict_without_modification",
    mutate: (source) =>
      replaceOnce(
        source,
        "let same = level == level_text(event.level())\n                && message == event.message()",
        "let same = true",
        "changed-payload-accepted-as-duplicate",
      ),
  },
  {
    id: "composite-source-key-isolation-removed",
    path: "crates/ingest-store/src/store.rs",
    namedTest: "same_key_from_different_source_is_independent",
    mutate: (source) =>
      replaceOnce(
        source,
        "WHERE source = ?1 AND request_key = ?2",
        "WHERE request_key = ?2",
        "composite-source-key-isolation-removed",
      ),
  },
  {
    id: "commit-reports-success-after-rollback",
    path: "crates/ingest-store/src/store.rs",
    namedTest: "failed_commit_never_returns_a_success_receipt",
    mutate: (source) =>
      replaceOnce(
        source,
        "transaction.rollback()?;\n            return Err(rusqlite::Error::InvalidQuery);",
        "transaction.rollback()?;\n            return Ok(());",
        "commit-reports-success-after-rollback",
      ),
  },
  {
    id: "frame-deadline-reset-per-read",
    path: "crates/ingest-service/src/server.rs",
    namedTest: "absolute_deadline_expires_slow_partial_frame",
    mutate: (source) =>
      replaceOnce(
        source,
        "timeout_at(deadline, stream.read(&mut chunk))\n            .await\n            .map_err(|_| ProtocolError::Fields)\n            .and_then(|result| result.map_err(|_| ProtocolError::Fields))?;",
        "timeout_at(Instant::now() + Duration::from_millis(50), stream.read(&mut chunk))\n            .await\n            .map_err(|_| ProtocolError::Fields)\n            .and_then(|result| result.map_err(|_| ProtocolError::Fields))?;",
        "frame-deadline-reset-per-read",
      ),
  },
  {
    id: "disconnect-forgets-accounting",
    path: "crates/ingest-service/src/worker.rs",
    namedTest: "cancellation_after_enqueue_keeps_terminal_accounting",
    mutate: (source) =>
      replaceOnce(
        source,
        "let _ = work.reply.send(result);",
        "if work.reply.send(result).is_err() { stats.accepted = stats.accepted.saturating_sub(1); }",
        "disconnect-forgets-accounting",
      ),
  },
  {
    id: "stopped-reported-before-worker-join",
    path: "crates/ingest-service/src/server.rs",
    namedTest: "shutdown_joins_worker_and_reports_terminal_counts",
    mutate: (source) =>
      replaceOnce(
        source,
        "let stats = match worker_join.await {",
        "let stats = match Ok::<Result<worker::WorkerStats, StoreError>, tokio::task::JoinError>(Ok(worker::WorkerStats::default())) {",
        "stopped-reported-before-worker-join",
      ),
  },
  {
    id: "unknown-wire-version-accepted",
    path: "crates/ingest-core/src/protocol.rs",
    namedTest: "unsupported_version_and_extra_fields_are_rejected",
    mutate: (source) =>
      replaceOnce(
        source,
        "_ => Err(ProtocolError::Version),",
        '_ => Event::new("source".to_owned(), "key".to_owned(), Level::Info, "message".to_owned()).map_err(ProtocolError::Validation),',
        "unknown-wire-version-accepted",
      ),
  },
  {
    id: "migration-marker-updated-before-failure",
    path: "crates/ingest-store/src/store.rs",
    namedTest: "incompatible_v1_migration_rolls_back_marker_and_rows",
    mutate: (source) =>
      replaceOnce(
        source,
        "fn migrate_v1(connection: &mut Connection) -> Result<(), StoreError> {",
        'fn migrate_v1(connection: &mut Connection) -> Result<(), StoreError> {\n    connection.execute_batch("PRAGMA user_version = 2;").map_err(map_sqlite_error)?;',
        "migration-marker-updated-before-failure",
      ),
  },
];

export function getCapstoneMutant(id: string): CapstoneMutant {
  const mutant = capstoneMutants.find((candidate) => candidate.id === id);
  if (!mutant) throw new Error(`Unknown capstone mutant: ${id}`);
  return mutant;
}
