# Task 5 report — restricted archive verification and release evidence

[Polski](task-5-report.pl.md)

Status: IMPLEMENTED; focused validation passed. A fresh full archive run was
started with loopback permission, but the parent workflow interrupted it before
the fresh-per-mutant pass completed. No fresh pass report is claimed below.

## Changed files

- `scripts/verify-capstone.ts` — closed `--fetch`/`--msrv` argument parser,
  pure archive/result predicates, exact authored ZIP extraction, manifest and
  lockfile checks, bounded Cargo commands, stable/MSRV tool selection, starter
  failure checks, external V1 consumer, workload execution, and JSON report
  generation. Importing the module performs no Cargo work.
- `scripts/capstone-mutants.ts` — eight named source mutations with one
  designated behavior test each; every mutation is extracted into its own
  temporary workspace and the reference is restored before the next control.
- `src/content/capstone-verification.test.ts` — argument, stale archive,
  command classification, and mutant-result predicate tests.
- `src/content/projects/durable-log-service/service.ts` — formatted authored
  service fixture and deterministic 512-event fixed workload with 256
  duplicate replays and receipt/count assertions. The concurrent duplicate
  async loopback test now admits its three-request fan-in with a queue of four.
- `src/content/projects/durable-log-service/archive.ts` — Polish runbook drills,
  local process boundary/authentication limitation, ADR alternatives and
  tradeoffs, backward-compatible V2 changelog entry, and release/performance
  limitation wording.
- `package.json` — `precontent:capstone` and `content:capstone` scripts.
- `.github/workflows/ci.yml` — stable and exact-MS​​RV invocations before generic
  offline archive verification, pinned seven-day stable/MSRV report uploads,
  and both capstone assessment suites in the selected toolchain jobs.

## Verifier contract and limits

The executable accepts only unique `--fetch` and `--msrv`. It does not accept
paths, source text, imports, dependency overrides, or arbitrary toolchains. It
builds the ZIP from the repository package contract, compares the bytes with
the served starter and solution ZIPs, checks the exact 35-member path list,
extracts only that package into a fresh `/tmp` directory, and rejects unsafe
archive paths/source forms. Cargo is invoked only with the trusted extracted
authored package.

Each Cargo invocation has an 8 MiB output cap and a 120-second wall limit.
Focused mutant tests and the external consumer have a 60-second wall limit.
Timeouts, signals, empty output, compile failures and missing named tests are
classified separately; only a clean compile followed by the designated named
test's single-test failure is accepted as mutant rejection. The starter must
compile and fail unfinished behavior with a nonempty `not yet implemented`
test result. The solution runs locked/offline check, test, fmt, Clippy with
`-D warnings`, rustdoc, doctests, no-default-features and all-features checks.

`--msrv` resolves cargo, rustc and rustdoc together through `rustup which`
for exact Rust 1.85.0 and puts that toolchain first in `PATH`; stable records
all three tool versions as well. The report hashes the actual served solution
ZIP and records command arguments, status, signal, stdout, stderr and duration.
Release status is always `Hold` while advisory/license review is incomplete.

## Focused commands and results

1. `npm run typecheck` — PASS (`tsc --noEmit`).
2. `npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` — PASS (2 files, 9 tests).
3. `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
4. `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
5. `git diff --check` — PASS.
6. `node --import tsx scripts/verify-capstone.ts --fetch --fetch` — PASS rejection of duplicate flags (exit 1).
7. `node --import tsx scripts/verify-capstone.ts --source learner.rs` — PASS rejection of source/path input (exit 1).

`npm run content:packages` regenerated both durable-log-service ZIPs before
focused checks. A full `npm run content:capstone` attempt was run with
loopback networking enabled and reached the authored stable starter/solution
checks; earlier unprivileged attempts correctly stopped at `Operation not
permitted` from the OS network boundary. The interrupted run did not produce a
fresh `test-results/capstone/<toolchain>/report.json`, so neither stable nor
MSRV archive verification is represented as a fresh pass in this report.

## Remaining evidence boundary

The verifier and CI wiring are present, but a complete stable and Rust 1.85.0
run still needs to finish in an environment that permits loopback process
tests. Until those runs complete and their reports are reviewed, the public
release remains Hold. No learner/imported source execution, public listener,
live advisory review, allocation profile, or portable elapsed-time threshold is
claimed.

## Review round 1 fixes

The verifier now invalidates the prior JSON report before every run and writes
a bounded result record from `finally`, including command arguments, status,
signal, stdout, stderr, classification, and duration for every command that
started. Temporary starter, solution, and mutant workspaces are registered at
creation and removed from the same `finally` block. Toolchain report data is
limited to explicit cargo/rustc/rustdoc paths, versions, selected flags, and
sanitized platform metadata; `process.env` is never serialized. The regression
test uses `CAPSTONE_SECRET=TOP_SECRET_SHOULD_NOT_APPEAR` and verifies that the
serialized metadata cannot contain that value.

Mutant rejection requires Cargo's expected exit status 101, exactly one
discovered occurrence of the designated test, exactly one failure and no other
failure, plus a matching `test result: FAILED` summary whose counts match the
discovered tests. Ambiguous duplicate and unrelated failure summaries are
covered by regression tests. The deadline mutant now only resets the read
deadline while preserving `ProtocolError::Fields`; the worker-join mutant
skips polling the join handle and supplies empty stats; the migration mutant
sets the schema marker outside the failed transaction; and the disconnect
mutant drops accounting only when the reply channel is canceled. The authored
tests exercise each advertised fault. The fixed workload records original
sequences and requires exactly 256 inserts, 256 duplicate receipts, and equal
sequence numbers for every replay.

The stable CI job runs the capstone assessment and uploads
`test-results/capstone/stable/report.json`; the Rust 1.85.0 job does the same
for MSRV and uploads its report. The async loopback check is an in-process
Tokio TCP test with bounded virtual time; it is not an external process test.

## Bounded review checks

- `bun typecheck` — PASS (`tsc --noEmit`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` — PASS (2 files, 11 tests; 30-second alarm).
- `npm run content:packages` — PASS; authored starter and solution ZIPs regenerated.
- `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
- `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
- `node --import tsx --input-type=module -e '<eight mutant target checks>'` — PASS; every named mutation changed its advertised source target.
- `git diff --check` — PASS.

## PR #18 final fixes

The E2E IndexedDB assertion now narrows the stored value as `UserState`, so
the Playwright suite has no explicit `any` at the persisted-exposure check.
The slow-partial-frame fixture registers the timer task before advancing the
paused clock, advances beyond the one-millisecond finite wait, and explicitly
aborts and joins the service task when the mutant does not emit a response.
The reference emits `ERR\tFIELDS` and passes; the resettable per-read deadline
mutant fails its named assertion and exits 101 without a 60-second hang.

Bounded explicit commands:

- `node --import tsx --input-type=module -e '<deadline mutant and restored Cargo tests>'` with 60-second subprocess limits and loopback permission — mutant exited 101; restored reference exited 0.
- `bun typecheck` — PASS.
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` — PASS (2 files, 12 tests).
- `npm run content:check`, `npm run content:rust`, `npm run content:packages`, and `git diff --check` — PASS.

## Archive formatting correction

The starter archive now uses rustfmt output for the six previously failing
fixtures: core domain/protocol and service worker/server/main/client. The
starter placeholders and `todo!` behavior are unchanged; only formatting was
updated. Both generated variants pass targeted
`cargo fmt --all -- --check`, and the solution passes bounded offline
`cargo clippy --workspace --all-targets --offline --locked -- -D warnings`.
Each targeted Cargo subprocess used a 60-second format limit or 120-second
Clippy limit and an 8 MiB output cap.

`npm run content:cargo` was also run. Its capstone formatting issue is fixed,
but the repository-wide command still reports the existing sandbox loopback
limitation in `tokio-service-workshop` integration tests (`Operation not
permitted`); this is retained as an honest limitation rather than reported as
a full repository pass.

## Final cancellation determinism fix

The lifecycle fixture now exposes a `connections_aborted` barrier emitted only
after drain-grace expiry has aborted and joined active connection handlers. The
fixture waits for that barrier after closing the requester stream and before
releasing the blocked storage worker, then asserts that the committed insert
remains accepted and accounted. This makes the reply oneshot receiver
cancellation deterministic for the disconnect mutant.

The bounded explicit Cargo check was run against the generated solution archive
with the named mutant and then the restored reference:

- `cargo test -p ingest-service --test lifecycle --offline --locked cancellation_after_enqueue_keeps_terminal_accounting` with a 60-second subprocess limit — mutant exited 101 as expected; restored reference exited 0 when loopback permission was enabled.
- The same command without loopback permission reached the test but exited 101 for `Operation not permitted`; that environment limitation is retained in the evidence boundary.
- `bun typecheck`, the 30-second focused verifier test command, `npm run content:packages`, `npm run content:check`, `npm run content:rust`, the 60-second capstone assessment command, and `git diff --check` — PASS.

No unbounded stable or MSRV archive verifier was started in this review round.
The report therefore continues to honestly hold release status until both
full archive runs complete with loopback permission and their JSON evidence is
reviewed.

## Review round 2 fixes

Both CI toolchain jobs now run the actual
`capstone-integration-assessment.test.ts` suite and retain
`capstone-verification.test.ts`; the MSRV command prepends the selected Rust
1.85.0 directory and sets `RUSTUP_TOOLCHAIN=1.85.0`. Stable and MSRV each
upload the report produced by their matching archive command.

The disconnect negative control now mutates the worker's reply-channel send:
when the requester has already disconnected and the oneshot receiver is
canceled, the mutant drops accepted accounting. Its async fixture sends the
frame, waits until it is enqueued and the worker is paused, closes the
requester stream, then releases the worker before asserting accepted and
inserted counts. The mutation does not depend on a special event key.

The report records the external consumer command and complete bounded result
when it runs, or an explicit `unexecuted` state and reason when an earlier
verification failure prevents it. The fixed workload command is recorded
before output assertions, so failed output checks remain in the report.
Mutant acceptance requires status 101 and exactly one Cargo-filtered test in
the `running`, discovered-test, and summary counts; additional passing,
failing, or duplicate test records are rejected. Report serialization and
workspace cleanup are nested so cleanup runs even if writing the JSON report
raises an error.

Additional bounded checks:

- `bun typecheck` — PASS (`tsc --noEmit`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 30; exec @ARGV' npm test -- --run src/content/capstone-verification.test.ts src/content/projects/durable-log-service/package.test.ts` — PASS (2 files, 11 tests; 30-second alarm).
- `npm run content:packages` — PASS; durable-log-service ZIPs regenerated after the disconnect fixture change.
- `npm run content:check` — PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`).
- `npm run content:rust` — PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`).
- `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 60; exec @ARGV' npx --no-install vitest run src/content/capstone-integration-assessment.test.ts` — PASS (1 file, 26 tests; 60-second alarm).
- `node --import tsx --input-type=module -e '<eight mutant target checks>'` — PASS; all eight source targets matched.
- `git diff --check` — PASS.
