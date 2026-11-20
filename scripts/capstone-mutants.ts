import assert from "node:assert/strict";

export type CapstoneTestTarget =
  | { crate: "ingest-store"; library: true }
  | {
      crate: "ingest-store";
      integration:
        | "transactions"
        | "migrations"
        | "stream_capacity"
        | "maintenance_recovery";
    }
  | { crate: "ingest-core"; integration: "public_api" }
  | { crate: "ingest-service"; integration: "lifecycle" };

export interface CapstoneMutant {
  id: string;
  path: string;
  namedTest: string;
  testTarget: CapstoneTestTarget;
  mutate(source: string): string;
}

function replaceOnce(
  source: string,
  before: string,
  after: string,
  id: string,
): string {
  assert(source.includes(before), `${id}: mutation target is absent`);
  return source.replace(before, after);
}

// Exact maintained admission block, moved intact by the precedence control.
const streamAdmission = String.raw`            if let Some(limit) = self.per_stream_limit {
                let stream_count: i64 = transaction
                    .query_row(
                        "SELECT count(*) FROM events WHERE source = ?1",
                        params![event.source()],
                        |row| row.get(0),
                    )
                    .map_err(map_sqlite_error)?;
                if stream_count < 0 || stream_count as usize >= limit.get() {
                    return Err(StoreError::Full);
                }
            }
`;

const streamCount = String.raw`let stream_count: i64 = transaction
                    .query_row(
                        "SELECT count(*) FROM events WHERE source = ?1",
                        params![event.source()],
                        |row| row.get(0),
                    )
                    .map_err(map_sqlite_error)?;`;

/**
 * Negative controls for the reviewed durable-log-service solution archive.
 * Each mutation has one exact behavior test and is applied to a fresh extraction.
 */
export const capstoneMutants: readonly CapstoneMutant[] = [
  {
    id: "changed-payload-accepted-as-duplicate",
    testTarget: { crate: "ingest-store", integration: "transactions" },
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
    testTarget: { crate: "ingest-store", integration: "transactions" },
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
    testTarget: { crate: "ingest-store", library: true },
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
    testTarget: { crate: "ingest-service", integration: "lifecycle" },
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
    testTarget: { crate: "ingest-service", integration: "lifecycle" },
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
    testTarget: { crate: "ingest-service", integration: "lifecycle" },
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
    testTarget: { crate: "ingest-core", integration: "public_api" },
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
    testTarget: { crate: "ingest-store", integration: "migrations" },
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
  {
    id: "stream-count-is-global",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "stream_capacity" },
    namedTest: "stream_capacity_k_two_counts_each_source_independently",
    mutate: (source) =>
      replaceOnce(
        source,
        streamCount,
        'let stream_count: i64 = transaction.query_row("SELECT count(*) FROM events", [], |row| row.get(0)).map_err(map_sqlite_error)?;',
        "stream-count-is-global",
      ),
  },
  {
    id: "stream-admission-before-identity",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "stream_capacity" },
    namedTest:
      "stream_capacity_k_one_preserves_retry_conflict_and_rejected_rows",
    mutate: (source) => {
      const id = "stream-admission-before-identity";
      const withoutAdmission = replaceOnce(source, streamAdmission, "", id);
      return replaceOnce(
        withoutAdmission,
        "        let prior = transaction",
        `${streamAdmission.replace(/^    /gm, "")}        let prior = transaction`,
        id,
      );
    },
  },
  {
    id: "stream-count-ignores-committed-rows",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "stream_capacity" },
    namedTest: "stream_capacity_same_limit_reopen_uses_committed_occupancy",
    // Omitting durable occupancy is a direct equivalent of a reset process-only count.
    mutate: (source) =>
      replaceOnce(
        source,
        streamCount,
        "let stream_count: i64 = 0;",
        "stream-count-ignores-committed-rows",
      ),
  },
  {
    id: "lower-stream-limit-deletes-rows",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "stream_capacity" },
    namedTest:
      "stream_capacity_lower_then_raise_preserves_rows_and_original_receipts",
    mutate: (source) =>
      replaceOnce(
        source,
        "        store.per_stream_limit = Some(per_stream_limit);",
        String.raw`        store.per_stream_limit = Some(per_stream_limit);
        store.connection.execute(
            "DELETE FROM events WHERE sequence IN (SELECT newer.sequence FROM events AS newer WHERE (SELECT count(*) FROM events AS older WHERE older.source = newer.source AND older.sequence <= newer.sequence) > ?1)",
            [per_stream_limit.get() as i64],
        ).map_err(map_sqlite_error)?;`,
        "lower-stream-limit-deletes-rows",
      ),
  },
  {
    id: "stream-full-returns-success",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "stream_capacity" },
    namedTest:
      "stream_capacity_k_one_preserves_retry_conflict_and_rejected_rows",
    mutate: (source) =>
      replaceOnce(
        source,
        "if stream_count < 0 || stream_count as usize >= limit.get() {\n                    return Err(StoreError::Full);",
        "if stream_count < 0 || stream_count as usize >= limit.get() {\n                    return Ok(Receipt { sequence: 0, disposition: Disposition::Inserted });",
        "stream-full-returns-success",
      ),
  },
  {
    id: "a8-reopen-limit-ignores-k3",
    path: "crates/ingest-store/src/store.rs",
    testTarget: { crate: "ingest-store", integration: "maintenance_recovery" },
    namedTest: "maintenance_reconfiguration_recovery_trace",
    mutate: (source) =>
      replaceOnce(
        source,
        "store.per_stream_limit = Some(per_stream_limit);",
        "store.per_stream_limit = Some(NonZeroUsize::new(2).unwrap());",
        "a8-reopen-limit-ignores-k3",
      ),
  },
];

export function getCapstoneMutant(id: string): CapstoneMutant {
  const mutant = capstoneMutants.find((candidate) => candidate.id === id);
  if (!mutant) throw new Error(`Unknown capstone mutant: ${id}`);
  return mutant;
}

/** Dispatch only the authored target; names and source paths never select a crate. */
export function capstoneMutantTestArgs(mutant: CapstoneMutant): string[] {
  const target = mutant.testTarget;
  return [
    "test",
    "-p",
    target.crate,
    ...("library" in target ? ["--lib"] : ["--test", target.integration]),
    "--offline",
    "--locked",
    mutant.namedTest,
    ...(mutant.id === "a8-reopen-limit-ignores-k3" ? ["--", "--exact"] : []),
  ];
}
