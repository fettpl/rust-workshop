# Durable Log Service Capstone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded Polish capstone in which learners integrate public Rust APIs, transactional idempotent storage, a supervised Tokio service, protocol evolution, and incident/release evidence.

**Architecture:** Add one data-driven module and one downloadable three-crate workspace. Browser exercises use standard-library contract models through the existing isolated runner; a restricted maintainer verifier checks the actual authored TCP/SQLite workspace. Preserve the distinction between model evidence, local package evidence, and independently assessed portfolio work.

**Tech Stack:** Rust 2024, stable and exact Rust 1.85.0; Tokio =1.53.1; rusqlite =0.40.2 with default features disabled and bundled SQLite; existing TypeScript/Vitest/Playwright/content archive infrastructure.

**Spec:** Original brief `<maintainer-home>/.codex/attachments/117d4ac4-b10e-41ad-87c4-eb4cd91c5ae4/pasted-text-1.txt`; `docs/advanced-curriculum.md`, especially “6. Capstone” and “Senior scope jako osobne dowody”; `docs/requirements-audit.md`. This plan records the bounded implementation contract below.

## Global Constraints

- Baseline audited: `main@4af640d719a04bca32747b29f56bfcc683c08841`.
- Preserve stable Rust, Rust 2024 Edition, Cargo, rustfmt, Clippy and exact tested lower bound Rust 1.85.0.
- All learner-facing material is Polish; lesson estimates are 8–20 minutes, with local project work estimated separately.
- Preserve PREDICT → RUN → OBSERVE → EXPLAIN → MODIFY → DEBUG → RECALL → APPLY and UNDERSTAND → PRACTICE → VERIFY → TRANSFER.
- Preserve all previous lesson IDs and schemaVersion 3. Do not add a persistence migration for additive curriculum data.
- Never execute learner/imported source using local Cargo, rustc, shell commands, or the maintainer verifier. Browser work remains behind RustRunner.
- Do not add SQLite or multi-file execution to the browser runner.
- Package downloads, local checklists, ADR completion and self-assessment do not automatically award mastery.
- Blank-page prompts contain a problem and criteria, without starter source, prescribed function signatures, or implementation steps. Existing signature-prescribing blanks are not the model for this milestone.
- Twelve executable gates and six independently authored coding retrievals supply automatic evidence. Six true portfolio blanks use rubric evidence and require human review for their open-ended design; describe this limitation explicitly.
- All authored starter Rust compiles; unfinished behavior fails identified tests. Infrastructure errors, missing test discovery, hangs and compile failures are not successful mutation detection.
- No authored unsafe code, registry publication, deployment, public listener, authentication claim, live advisory claim, universal performance claim, or professional-readiness claim.
- Read relevant `node_modules/next/dist/docs/` before changing any Next.js code; this plan needs no new route or component.
- Subagents, if used during execution, follow AGENTS.md: gpt-5.6-luna with high reasoning. Keep package implementation sequential across dependent boundaries; independently review content and verifier after implementation.

## Decision and bounded scope

Proceed with this capstone. It closes an explicit portfolio gap and combines existing Log Analyzer, public-api-workspaces, Tokio network service, Service Operations and Dependency Assurance work. Another isolated advanced topic would leave the integration gap unchanged.

The product is **Dziennik zdarzeń: trwały serwis lokalny**, a loopback TCP ingestion service with a public Rust client/domain API and a SQLite receipt ledger. A successful reply means the transaction committed. A missing reply means the outcome may be unknown; retry the same key and content. The course must never call this end-to-end exactly-once delivery.

Use SQLite transactions rather than authoring a miniature storage engine. WAL with synchronous FULL is a deliberate durability setting, conditional on the filesystem/device honoring sync. Validate actual configured pragma values. SQLite describes these semantics in [WAL](https://www.sqlite.org/wal.html) and [PRAGMA synchronous](https://www.sqlite.org/pragma.html). rusqlite 0.40.2 and its bundled feature are documented in its [versioned manifest](https://raw.githubusercontent.com/rusqlite/rusqlite/v0.40.2/Cargo.toml). Its manifest does not establish this project's MSRV: the first task must compile the chosen complete locked graph on 1.85.0. Do not silently raise the floor if that fails.

Default resource limits: 8 admitted connections, 16 queued commands, one storage owner, 4096 frame bytes before LF, 2048 UTF-8 message bytes, 10000 stored events. Client read deadline is absolute per frame, not reset per byte. Queue-full responses are explicit Busy, with no detached waiting tasks. Existing-key retries work even when the stored-event limit is reached. No eviction of receipts is allowed because that would weaken idempotency.

Wire records use tab-delimited bounded lines: `1\tSOURCE\tKEY\tLEVEL\tMESSAGE\n`; version 2 inserts `CORRELATION` between LEVEL and MESSAGE. SOURCE and KEY are 1–32 ASCII letters/digits/underscore/hyphen; LEVEL is INFO/WARN/ERROR; MESSAGE is nonempty UTF-8 without tabs/CR/LF. V2 CORRELATION has the same identifier alphabet, with `-` meaning absent. V1 normalizes correlation to absent. Unknown versions, invalid UTF-8, extra fields, oversized frames and unterminated EOF fail explicitly. One request per connection; close after its bounded response. Responses are `OK\tSEQ\tinserted\n`, `OK\tSEQ\tduplicate\n`, or `ERR\tCODE\n`. Error codes are stable uppercase tokens, never raw SQL errors or payload text.

Idempotency key is `(source, key)`; equality compares level, message and normalized correlation exactly. Same key/same content returns the original sequence; changed content returns Conflict without modification. Parameterized SQL and a UNIQUE constraint protect this invariant in one transaction. A single blocking worker owns the connection; a bounded Tokio mpsc channel carries owned requests and oneshot responses. Disconnecting a client after enqueue does not retract storage work.

Shutdown closes admission, finishes or rejects connection reads, closes all storage senders, drains queued work, joins the storage worker and joins every async child. A grace deadline stops waiting clients; it cannot truthfully promise cancellation of an already-running SQLite call. Keep awaiting the bounded worker and report drain-overdue; an external process supervisor is the ultimate termination boundary. Never detach spawn_blocking and report Stopped.

## Catalog identities and learner scope

- Module ID: `capstone-integration`.
- Project ID: `durable-log-service`.
- Package ID: `durable-log-service-workspace`.
- Module title: `Capstone: trwały serwis logów`.
- Prerequisite module IDs: `public-api-workspaces`, `tokio-network-service`, `service-operations`, `dependency-assurance`, `property-contracts`.
- Six concepts, one per lesson, use the lesson ID plus `-contract`; six competencies use the lesson ID plus `-competency`.
- Project starts at lesson 1 and adversarial entry is lesson 6; lessonIds and reviewConceptIds contain all six respective IDs.

| Lesson ID and Polish title | Primary gate A | Primary gate B | Blank-page task | Independent coding retrieval |
| --- | --- | --- | --- | --- |
| `capstone-domain-boundary` — Wartość przyjęta to nie dowolny tekst | `capstone-domain-validate`: validate byte bounds, identifier alphabet and message controls before constructing private fields | `capstone-domain-errors`: map domain/storage failures to stable public codes without leaking details | `capstone-domain-blank`: zaprojektuj rejestr pomiarów czujników, który nie dopuszcza niepoprawnej wartości; przedstaw kontrakt i kontrprzykłady | `review-capstone-domain`: validate a shipment reference and Unicode destination under different bounds |
| `capstone-idempotent-commit` — Ponowienie bez podwójnego zapisu | `capstone-commit-replay`: same composite key/content returns old receipt; different content conflicts | `capstone-commit-atomicity`: apply staged mutation only after successful commit; failed commit leaves both records and receipts unchanged | `capstone-commit-blank`: zaprojektuj rejestr rezerwacji odporny na ponowienie po utracie odpowiedzi; pokaż konflikt treści i awarię przed zapisem | `review-capstone-commit`: import payment notices under `(account, external_id)` with duplicate/conflict outcomes |
| `capstone-bounded-lifecycle` — Każde przyjęte żądanie ma właściciela | `capstone-lifecycle-admit`: cap active and queued work separately; closed admission and queue full do not increase accepted count | `capstone-lifecycle-settle`: late result after client cancellation is still accounted; Stopped requires joined worker and all accepted outcomes | `capstone-lifecycle-blank`: zaprojektuj kolejkę generowania raportów z pełną kolejką, rozłączeniem odbiorcy i zamknięciem; rozlicz każdą pracę | `review-capstone-lifecycle`: reconcile image-export jobs with dropped subscribers and an unfinished worker |
| `capstone-protocol-evolution` — Nowa wersja bez utraty starego klienta | `capstone-protocol-decode`: normalize V1 and V2, reject unknown versions and extra fields | `capstone-protocol-migrate`: transactional migration plan accepts old supported schema, no-ops current, rejects newer schema without mutation | `capstone-protocol-blank`: zaprojektuj ewolucję formatu dziennika magazynu; zachowaj stare dane i jawnie odrzuć nieznaną wersję | `review-capstone-protocol`: normalize V1/V2 job tickets with a new optional routing label and version mismatch |
| `capstone-incident-recovery` — Awaria, dowód i bezpieczne ponowienie | `capstone-incident-correlate`: group complete attempt/storage signals by request identity, preserving attempt vs event counts | `capstone-incident-decide`: return Unknown for missing commit evidence; distinguish committed/no-reply, rollback and rejected-before-admission | `capstone-incident-blank`: napisz plan odtworzenia importu po utracie połączenia; wskaż znane fakty, brakujące sygnały i bezpieczny kolejny krok | `review-capstone-incident`: diagnose a receipt printer incident where completion and delivery differ |
| `capstone-release-evidence` — Wydanie związane z konkretnym artefaktem | `capstone-release-bind`: reject evidence for a different archive digest, incomplete checks or stale observation window | `capstone-release-decide`: allow local candidate only with complete compatibility/recovery checks; unknown supply-chain status keeps public release Hold | `capstone-release-blank`: przygotuj dossier wydania eksportera archiwów; udokumentuj zmianę niezgodną, plan powrotu i ograniczenia dowodów | `review-capstone-release`: evaluate a migration-tool candidate using independently named checks and an injected date |

Gate step IDs above are exact. Criterion IDs append `-criterion`. Each criterion references its matching primary gate; do not falsely claim an unrelated exercise as an interchangeable alternative. Provide six lesson-local coding recall steps with IDs `capstone-domain-recall`, `capstone-commit-recall`, `capstone-lifecycle-recall`, `capstone-protocol-recall`, `capstone-incident-recall`, `capstone-release-recall`; these are additional immediate practice, with different inputs/contracts from the independent reviewExercises. A reveal prevents independent credit for that attempt. Blank-page rubric evidence cannot rescue a revealed coding gate. Preserve delayed retrieval behavior after at least 24 hours through the existing engine.

Each lesson includes a prediction, contrasting worked observation, two tested gates, a concise explanation, a problem-only blank, immediate recall, project connection, misconceptions and progressive hints. Only the 12 named primary gates have `evidenceGate: true`. Portfolio blanks have `kind: blank`, no `code`, rubric evaluator, and a reference solution available as reveal. This is an explicit bounded compromise: arbitrary self-designed APIs cannot be honestly graded by the current single-file hidden-function-test runner. Do not disguise a prescribed API as a true blank-page task or upgrade rubric self-assessment into verified mastery.

## File map

Create application content:

- `src/content/capstone-integration.ts`: sources, concepts, competencies, module, ordered lessons and review registration.
- `src/content/capstone-integration/contracts.ts`: six groups of authored std-only snippets and exact test harness strings; keep content prose separate.
- `src/content/capstone-integration-assessment-fixtures.ts`: canonical/equivalent/behavioral-mutant mapping for all 24 tested contracts (12 gates + 6 immediate recall + 6 independent review).
- `src/content/capstone-integration-assessment.test.ts`: compile canonical/equivalent/mutant, then require runtime assertion failure for the mutant.
- `src/content/capstone-integration-integration.test.ts`: IDs, graph, 12 gates, 6 rubric blanks, 6 reviews, independent exposure and save compatibility.
- `src/content/projects/durable-log-service.ts`: ProjectContract and ProjectPackage registration.
- `src/content/projects/durable-log-service/archive.ts`: authored workspace manifest, lockfile and documentation strings.
- `src/content/projects/durable-log-service/core.ts`: domain/protocol Rust file strings.
- `src/content/projects/durable-log-service/store.ts`: SQLite/storage Rust file strings.
- `src/content/projects/durable-log-service/service.ts`: runtime/client/process Rust file strings.
- `src/content/projects/durable-log-service/package.test.ts`: package layout, starter/solution, exposure references, exact dependencies.
- `scripts/verify-capstone.ts`: trusted archive extraction, exact toolchains, lifecycle/recovery/external-consumer checks and report.
- `scripts/capstone-mutants.ts`: controlled source mutations with a fixed expected failing test per mutation.
- `src/content/capstone-verification.test.ts`: argument allowlist, archive identity, stale evidence and mutation-result classification.
- `tests/e2e/capstone-integration.spec.ts`: navigation, gate result, blank rubric limits, project download, notes/resume and reveal independence.

Modify `src/content/course.ts`, `package.json`, `.github/workflows/ci.yml`, `scripts/verify-offline.mjs`, `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/verification.md`, `docs/ci-cd.md`. Generated ZIPs live under `public/projects/durable-log-service-workspace/`; follow existing generated-asset policy rather than independently editing archive bytes.

The downloadable workspace has these exact 35 files:

```text
Cargo.toml
Cargo.lock
README.md
PROTOCOL.md
THREAT_MODEL.md
RUNBOOK.md
CHANGELOG.md
RELEASE.md
PERFORMANCE.md
adr/0001-transaction-and-retry.md
adr/0002-storage-owner-and-shutdown.md
crates/ingest-core/Cargo.toml
crates/ingest-core/src/lib.rs
crates/ingest-core/src/domain.rs
crates/ingest-core/src/protocol.rs
crates/ingest-core/tests/public_api.rs
crates/ingest-core/tests/protocol_properties.rs
crates/ingest-store/Cargo.toml
crates/ingest-store/src/lib.rs
crates/ingest-store/src/schema.rs
crates/ingest-store/tests/transactions.rs
crates/ingest-store/tests/migrations.rs
crates/ingest-service/Cargo.toml
crates/ingest-service/src/lib.rs
crates/ingest-service/src/config.rs
crates/ingest-service/src/worker.rs
crates/ingest-service/src/server.rs
crates/ingest-service/src/telemetry.rs
crates/ingest-service/src/main.rs
crates/ingest-service/src/bin/ingest-client.rs
crates/ingest-service/tests/lifecycle.rs
crates/ingest-service/tests/loopback.rs
crates/ingest-service/tests/restart.rs
crates/ingest-service/tests/process.rs
crates/ingest-service/examples/fixed_workload.rs
```

## Task 1: establish the workspace and public contract

**Files:** create the four project source modules and package test listed above; initially implement core and manifest sections only. Do not register incomplete curriculum in course.ts.

**Interfaces:** workspace members are `crates/ingest-core`, `crates/ingest-store`, `crates/ingest-service`; resolver 3, edition 2024, rust-version 1.85.0, publish=false for every member. Core is std-only. Store uses exactly rusqlite 0.40.2, default-features=false, features=[bundled]. Service uses exactly Tokio 1.53.1 with macros/rt/sync/time/net/io-util; test-util only for dev. No service feature may disable validation, limits or persistence. Every crate forbids unsafe code.

Public core signatures:

```rust
pub enum Level { Info, Warn, Error }
pub struct Event { /* private validated fields */ }
pub enum ValidationError { Source, Key, Message, Correlation }
impl Event {
    pub fn new(source: String, key: String, level: Level, message: String)
        -> Result<Self, ValidationError>;
    pub fn with_correlation(self, correlation: Option<String>)
        -> Result<Self, ValidationError>;
    pub fn source(&self) -> &str;
    pub fn key(&self) -> &str;
    pub fn level(&self) -> Level;
    pub fn message(&self) -> &str;
    pub fn correlation(&self) -> Option<&str>;
}
pub enum Disposition { Inserted, Duplicate }
pub struct Receipt { pub sequence: u64, pub disposition: Disposition }
pub enum ProtocolError { TooLarge, Utf8, Version, Fields, Validation(ValidationError) }
pub fn decode_frame(bytes: &[u8]) -> Result<Event, ProtocolError>;
pub fn encode_v1(event: &Event) -> Result<Vec<u8>, ProtocolError>;
pub fn encode_v2(event: &Event) -> Vec<u8>;
```

Derive Debug/PartialEq/Eq where tests require comparison; Level and Disposition also Copy/Clone. Event can be Clone for owned transport tests, with no gratuitous clone requirement imposed on learners.

- [ ] Write core tests first: empty/boundary/overbound identifiers; multibyte message byte bound; CR/tab/newline rejection; old Event::new caller compiles; V1/V2 normalization; unsupported version and extra-field rejection; V1 encoder refuses nonempty correlation rather than dropping it.
- [ ] Run targeted tests and confirm missing implementation failures.
- [ ] Implement private field constructors and bounded pure decoder, then run those tests again.
- [ ] Generate Cargo.lock using the actual resolver and compile the minimal bundled SQLite and Tokio graph on stable and exact 1.85.0. Record dependency versions/licenses and native compiler requirement. If 0.40.2 cannot compile on 1.85.0, stop dependency integration and report the exact incompatibility; do not claim this dependency spike passed or silently downgrade SQLite.
- [ ] Add deterministic property coverage over identifier boundaries and bounded generated UTF-8 strings: `decode_frame(encode_v2(e)) == e`; V1 round-trip for correlation-free values. Use explicit finite enumeration, labeled bounded exhaustive properties, without adding another dev dependency.
- [ ] Commit the independently verified core contract and resolved dependency graph.

## Task 2: transactional storage, migration and restart behavior

**Files:** store.ts, archive.ts, package.test.ts; corresponding ingest-store files.

**Consumes:** Event, Receipt, Disposition. **Produces:**

```rust
pub struct Store { /* owned Connection, configured event limit */ }
pub enum StoreError { Conflict, Full, Busy, UnsupportedSchema(u32), Storage(rusqlite::Error) }
impl Store {
    pub fn open(path: &std::path::Path, max_events: usize) -> Result<Self, StoreError>;
    pub fn ingest(&mut self, event: &ingest_core::Event) -> Result<ingest_core::Receipt, StoreError>;
    pub fn count(&self) -> Result<u64, StoreError>;
}
```

Schema version 1: events(sequence INTEGER PRIMARY KEY, source TEXT NOT NULL, request_key TEXT NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL, UNIQUE(source,request_key)). Version 2 adds nullable correlation. Existing empty DB initializes directly to v2; v1 migration alters the table and updates user_version in the same transaction; v2 is no-op; higher version is rejected before modification. Configure and read back journal_mode WAL, synchronous FULL and a finite busy timeout. Ingest uses an IMMEDIATE transaction; inspect prior row before capacity check; compare canonical fields, insert once, commit, then return receipt.

- [ ] Write tests with fresh per-test temporary directories: first insert; equal replay; different payload conflict; different source/same key succeeds; UTF-8 survives reopen; same receipt after reopening; full store rejects new keys but accepts duplicate; lock contention returns Busy; both correlation values participate in conflict checking.
- [ ] Write migration rollback test: use a v1 DB containing a deliberately incompatible schema that fails ALTER, then assert user_version and existing rows remain unchanged. Test newer schema rejects unchanged.
- [ ] Implement transaction/migration logic and run all store tests. Include source chaining for Storage while preserving stable public wire codes.
- [ ] Add a test-only failure seam around transaction completion to prove no success receipt escapes a failed commit. Keep failure injection private under cfg(test), absent from wire/config/features.
- [ ] Commit only after stable and 1.85.0 store checks pass.

## Task 3: supervised service and real process contracts

**Files:** service.ts, archive.ts and package.test.ts; corresponding ingest-service files.

**Consumes:** core and Store interfaces. **Produces:**

```rust
pub struct Config {
    pub bind: std::net::SocketAddr,
    pub database: std::path::PathBuf,
    pub max_connections: usize,
    pub queue_capacity: usize,
    pub max_events: usize,
    pub frame_deadline: std::time::Duration,
    pub drain_grace: std::time::Duration,
}
pub struct ShutdownReport {
    pub accepted: u64, pub inserted: u64, pub duplicates: u64,
    pub failed: u64, pub pending: u64, pub worker_joined: bool,
    pub drain_overdue: bool,
}
pub async fn serve(listener: tokio::net::TcpListener, config: Config,
    shutdown: tokio::sync::oneshot::Receiver<()>) -> Result<ShutdownReport, ServiceError>;
```

Define ServiceError with Config, Io(std::io::Error), Store(StoreError), WorkerStopped and Join(tokio::task::JoinError); Display/Error implementations retain sources. Reject zero limits, non-loopback bind, zero deadlines and unsupported options. CLI is `ingest-service --db PATH --bind 127.0.0.1:PORT`; port zero is valid and the actual address prints as READY only after storage initialization. EOF on control stdin requests shutdown, allowing deterministic process tests without platform-specific signals. Client takes explicit address plus source/key/level/message, performs one request and returns exit 0 on receipt, 2 on protocol/domain rejection, 3 on transport/unknown outcome.

- [ ] Write paused-clock state tests for full admission, queue full, absolute frame deadline, client cancellation after enqueue, grace expiry and worker join accounting. Use barriers/oneshots for ordering, never sleeps as proof.
- [ ] Implement bounded accept/task management, bounded frame decoder and one owned spawn_blocking storage loop using blocking_recv. Keep at most eight connection tasks; close excess sockets, counting transport refusal separately from accepted storage work.
- [ ] Ensure shutdown does not retain a hidden sender clone. Pending is zero and worker_joined true before returning successful final report. The terminal invariant is accepted = inserted + duplicates + failed.
- [ ] Write loopback tests using port zero: split frame/UTF-8 chunks, oversized line, slow partial frame, unknown version, duplicate concurrent clients and changed-content conflict. Bound every test with a harness watchdog; watchdog failure is infrastructure/failure, never passing evidence.
- [ ] Write child-process tests: valid invocation/invalid flags, controlled EOF shutdown, restart against same DB, and lost reply after committed storage. For crash recovery, receive an OK receipt, kill child, restart, replay and require same sequence. For unacknowledged crash permit absent-or-committed result but require exactly one final stored row after replay.
- [ ] Implement structured stderr events with fixed fields event_kind/source/key/sequence/outcome; omit message and filesystem/SQL details. Emit separate attempt and unique-insert counters; no unbounded event buffer.
- [ ] Commit after all service tests and Clippy pass on both toolchains.

## Task 4: Polish lessons and independent assessment contracts

**Files:** all capstone content/assessment files, course.ts.

**Consumes:** bounded package semantics. **Produces:** named exports `capstoneIntegrationModule`, `capstoneIntegrationLessons`, `capstoneIntegrationConcepts`, `capstoneIntegrationCompetencies`, `capstoneIntegrationSources`, `capstoneIntegrationReviewExercises` and `capstoneIntegrationAssessmentFixtures`.

Tests are behavior-first. The browser contracts model domain boundaries, a commit decision/state transition, lifecycle accounting, normalization/migration decisions, correlated evidence and release decisions. They do not claim to run SQLite or TCP. For each tested contract define canonical, structurally different equivalent and compiling mutant; fixtures have `{ id: string, equivalent: string, mutant: string }` and must cover exactly the tested assessment IDs, not rubric blanks.

- [ ] Add integration assertions for exact lesson order/IDs, six concepts, 12 evidenceGate steps, 12 criteria, six blank steps without code or prescribed signatures, six independent review registrations and 24 test contracts.
- [ ] Implement each lesson row in the catalog table, one at a time, with prediction → contrast → gate → explanation → second gate → recall → blank/project transfer. Add misconception-specific feedback, two progressive hints and reference solution; do not copy whole gate implementations into reviews under renamed functions.
- [ ] For all 24 contracts compile canonical/equivalent/mutant with rustc --edition=2024 --test. Canonical and equivalent must pass nonempty tests; mutants must compile then fail the named assertion. Record starter behavior separately. Empty test execution cannot pass.
- [ ] Add mastery tests using createInitialState/recordEvidence/moduleGate: all twelve gates without hints/reveal can pass; completion only cannot; a revealed attempt cannot supply independent credit; six rubric blanks alone cannot establish understood/retained; delayed independent retrieval remains supported.
- [ ] Add source entries with these exact IDs: `capstone-sqlite-transactions`, `capstone-sqlite-wal`, `capstone-sqlite-pragmas`, `capstone-rusqlite-transactions`, `capstone-tokio-mpsc`, `capstone-tokio-blocking`, `capstone-cargo-semver`, `capstone-rust-errors`. Resolve each to official documentation, use actual review date and accurate stable/versioned classification; pin Tokio/rusqlite URLs to selected versions.
- [ ] Register exports and the project in course.ts only once all content validation passes. Append the available bounded capstone roadmap entry while retaining remaining production scope.
- [ ] Commit the content and authored assessment evidence.

## Task 5: restricted archive verification and release evidence

**Files:** verify-capstone.ts, capstone-mutants.ts, capstone-verification.test.ts, package.json, .github/workflows/ci.yml, project documentation strings.

**Interfaces:** `npm run content:capstone -- --fetch` and `npm run content:capstone -- --fetch --msrv`; accept only unique `--fetch` and `--msrv`. Add precontent:capstone = content:packages. Verifier exports pure argument/result predicates for Vitest without executing Cargo on import. Its executable entry accepts no paths, source, dependency overrides, imports or arbitrary toolchains.

- [ ] Test rejection of unknown/duplicate flags and learner/path inputs. Test stale archive comparison and failure classification: compile errors, missing named tests, timeout/signal and empty test output do not count as rejected mutants.
- [ ] Implement fresh temporary extraction of only the exact authored package. Compare generated bytes against both served ZIPs, validate expected path list, member manifests, exact dependency declarations, lockfile, publish=false, edition/MSRV and absence of unsafe source. Pin cargo/rustc/rustdoc consistently in --msrv mode.
- [ ] Fetch only when requested, then run offline/locked workspace check/test/fmt/Clippy/rustdoc and default/no-default/all-feature configurations (no capability-removing feature is defined). Run doc tests. Preserve stdout/stderr/toolchain metadata.
- [ ] Build an independent external consumer from the extracted ingest-core path. Its authored source uses the pre-correlation `Event::new` call and accessors; it must still compile and round-trip V1. Keep consumer fixture generation internal to verifier, not user supplied.
- [ ] Add eight controlled mutants with exact named test rejection: accept changed payload as duplicate; remove composite source key isolation; report commit success after rollback; reset frame deadline per read; forget accounting after client disconnect; return Stopped before worker join; accept unknown wire version; update schema marker before failing migration. First require each mutant to compile and require its designated behavior test to fail; restore reference and rerun that test before the next mutation.
- [ ] Run fixed_workload example over 512 bounded events with a deterministic duplicate schedule; assert expected unique count/receipt equality before emitting elapsed-time observations. Record workload, compiler and environment; do not turn elapsed time into a portable pass/fail threshold. PERFORMANCE.md states no runtime allocation counter/profile was added.
- [ ] Generate `test-results/capstone/<stable-or-msrv>/report.json` with archive SHA-256, toolchain versions, exact command results, schema/wire versions, recovery and mutant outcomes. Hash the actual served solution ZIP, not a source-only approximation. RELEASE.md is a procedure/template, never a fabricated fresh pass report; public release stays Hold when live advisory/license review is incomplete.
- [ ] Add stable and exact-MSRV CI invocation before generic content:cargo so dependency fetch precedes its offline run. Upload capstone reports with existing pinned upload-artifact SHA and seven-day retention. Include new assessment test in MSRV focused tests. Keep minimal permissions and no new secret.
- [ ] Update RUNBOOK.md with queue full, busy store, lost reply, oversized input and overdue drain drills; THREAT_MODEL.md with local process boundary and lack of authentication; two ADRs with alternatives/tradeoffs; CHANGELOG.md with backward-compatible v2 extension and rejected breaking changes.
- [ ] Commit after authored starter check compiles and fails unfinished behavior, solution passes, eight mutants are rejected and restored solution passes on both toolchains.

## Task 6: learner integration, offline behavior and documentation

**Files:** e2e/capstone-integration.spec.ts, verify-offline.mjs and documentation files in file map.

- [ ] Add E2E flow that searches `trwaly serwis`, opens the module, observes an actual gate attempt using the existing mocked remote-runner contract, saves a draft/note and resumes the exact step. Verify project selection, starter/solution downloads and reveal exposure without fabricated Cargo execution evidence.
- [ ] Ensure solution package exposure references include every primary gate whose answer is disclosed by the package; preserve independent review and open-ended blank exposure. Starter preview references include only truly disclosed answers. Assert those sets explicitly in package.test.ts.
- [ ] Extend offline verification to download/cache both capstone ZIP variants and compare bytes, save a capstone draft/note, disable network, reload and resume unchanged. Preserve checks for all prior twelve packages.
- [ ] Update current catalog counts consistently: lessons 158→164, modules 42→43, concepts 161→167, blanks 113→119, traces stay 7, sources 300→308, projects/packages 12→13. The new module adds 12 gates and 6 independent coding reviews; do not invent a global gate total without computing it. Authored package file count is 35.
- [ ] Fix existing stale present-tense counts in requirements-audit.md (154/41/157/109/295 and “41 modules”) while retaining clearly labeled historical run counts. Replace “capstone remains planned” with the bounded delivered scope only after verification. Keep runtime parser allocations, full property/fuzz scope, live advisory refresh, registry publication, lending async, production operations and human pilot open.
- [ ] Run lint, typecheck, npm test, content:check, content:rust, content:capstone stable/MSRV, content:cargo, content:audit, build, full production E2E without retries and offline check. Run existing special verifiers through unchanged CI. Record actual test totals/results with tested commit; do not copy old counts as current results.
- [ ] Obtain two independent implementation reviews covering transaction/recovery/lifecycle correctness and learner evidence/independence. Record their actual findings and responses. These are software reviews, not the learner pilot or two human portfolio reviews required to substantiate senior competence.
- [ ] Commit the completed integration and truthful verification report; open a PR if authorized by the parent task's workflow.

## Acceptance checklist

- [ ] Six Polish lessons are reachable; exact new IDs are unique and existing saves/IDs remain compatible.
- [ ] Twelve behavioral gates, six true problem-only blanks and six independent coding retrievals exist; all 24 fixed coding contracts have passing alternative implementations and failing compiling mutants.
- [ ] Blank rubric limits and browser-model vs local-package evidence are explicit in learner copy.
- [ ] Downloaded workspace has three crates, 35 files, starter/solution parity and stable/MSRV-tested pinned dependencies.
- [ ] Successful receipt follows commit; retry returns same sequence; conflicting payload is unchanged; reopen and acknowledged process-crash replay preserve receipt.
- [ ] One transaction covers key/payload/receipt consistency; migration failure does not publish a new schema marker.
- [ ] Resource caps, absolute deadline, loopback boundary and frame validation are exercised by actual TCP tests.
- [ ] Disconnect after enqueue does not erase accepted work; final accounting balances; every worker is joined; overdue drain is not falsely reported as cancellation.
- [ ] Old external client still compiles and uses V1; V2 round-trip and unknown-version rejection are checked.
- [ ] Eight package mutants fail the intended behavioral tests and the restored reference passes.
- [ ] Verifier rejects arbitrary source/paths and never interprets infrastructure failures as evidence.
- [ ] Reports bind to current ZIP digest and actual toolchain/commands; no stale fixture is represented as a fresh incident/release result.
- [ ] Production E2E and offline ZIP/resume checks pass without retries; current documentation counts agree.
- [ ] No automatic seniority claim, production deployment claim, universal timing/allocation claim, live advisory claim or learner-pilot claim appears.

## Self-review against the original brief

The plan closes the fifth target portfolio project's integration gap while preserving the original four spiral projects and supplemental laboratories. It retains active discovery, compiler feedback, Polish learner context, independent coding gates, delayed recall, notes/resume and local-first downloads. SQLite/Cargo/TCP execute only as trusted authored package verification or by the learner locally; no new unsafe local runner is introduced.

The original blank-page rule conflicts with the repository's common signature-prescribing test pattern. This plan chooses genuine open-ended portfolio blanks with honest rubric limits and separately strong executable gates. It does not claim automatically verified mastery of arbitrary architecture. A later trusted remote project evaluator would be a separate product milestone.

The advanced map's full capstone includes runtime allocation measurement, benchmark/profile thresholds, reproducible CI in a stronger sense, human decision review and broader incident injects. This bounded milestone adds a fixed workload observation and artifact-bound checks, but does not close runtime allocator verification, hardware power-loss validation, multi-process operational hardening, authenticated networking, backup/restore operations, live supply-chain review, registry publication, human learning effectiveness or professional readiness. Mark these as remaining scope rather than declaring the whole senior map complete.

No production implementation or verification run was performed while preparing this plan. Dependency compatibility is an explicit first execution gate, not a verified result.
