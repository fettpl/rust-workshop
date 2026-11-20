# Async Lending Contracts: Borrowed Futures, Cancellation, and Dispatch Boundaries

## Objective

Add a bounded advanced-Rust milestone that teaches the ownership boundary between
borrowed async work and dispatch. The module must make learners reason about who
owns data during `Pending`, how long a borrow lasts, when a cursor is committed,
and which effects cancellation does not undo.

The milestone extends the existing `tokio-service-workshop`; it does not add a
fourteenth project or replace existing async, GAT, cancellation, or stream
modules.

## Scope

- Five Polish learner lessons and five concepts.
- Ten gate criteria and five independent code reviews.
- Real futures and borrowed callbacks, including controlled `Pending -> Ready`.
- Stable Rust 1.85 syntax only; no manual nightly `CallRefFuture` or
  `async_call_mut`, no unsafe, custom executor, or new production dependency.
- Stable and exact Rust 1.85 archive verification, with starter rejection,
  compile-pass/compile-fail fixtures, behavior mutants, and offline evidence.

## Lesson contracts

1. **async-lending-receiver** — keep a borrowed result tied to the invocation
   across suspension; prove readiness, data integrity, exhaustion, and reject a
   second borrow while the first result is alive.
2. **async-lending-callbacks** — run a sequential `AsyncFnMut` callback whose
   future borrows its argument or closure state; preserve order, mutate a local
   accumulator, and stop after an error without requiring `'static` or cloning.
3. **async-lending-cancel-commit** — distinguish receiving data, callback
   completion, and cursor commit; prove that cancellation before commit does not
   advance the cursor while a completed commit is not rolled back.
4. **async-lending-send-boundary** — distinguish `Self: Send`, `Future: Send`,
   local borrows, and `'static` spawn requirements; expose a separate owned
   report future that is genuinely safe for `tokio::spawn`.
5. **async-lending-dyn-adapter** — choose static lending or an explicit boxed
   adapter with a documented cost; support heterogeneous providers and local
   lifetimes without pretending every GAT/async trait is dyn-compatible.

## Project changes

Extend the generated `tokio-service-workshop` starter and solution archives with:

- `src/lending.rs`: bounded packet ownership, borrowed access, and a sequential
  visitor.
- `src/report_source.rs`: owned reports, a static `Send` boundary, and a boxed
  adapter.
- `examples/borrowed_batch.rs`: an executable local callback and an owned
  producer sent to a task.
- `tests/lending_contract.rs`: controlled suspension, cancellation, commit,
  error, and adapter behavior.
- `ASYNC-LENDING.md`: ownership diagram, cancellation points, static-versus-
  boxed ADR, and limitations.

Do not change the existing TCP protocol. The new public library API must be used
by the example and tests, not left as an unused fixture.

## Content and verifier work

- Add `src/content/async-lending-core.ts` for the first two lessons.
- Add `src/content/async-lending-boundaries.ts` for the remaining lessons.
- Add `src/content/async-lending-module.ts` with prerequisites, concepts, gates,
  and five transfer tasks.
- Add focused assessment fixtures/tests and integration tests.
- Extend `src/content/projects/tokio-service.ts` and archive tests.
- Add `scripts/verify-async-lending.ts` and `content:async-lending`.
- Register the module in `course.ts`, resume/offline cases, source metadata, and
  scope documentation while preserving schema v3 and all existing IDs.

## Evidence and CI

- All 15 assessed tasks need canonical and materially different equivalent
  solutions; a compiling behavior mutant must fail.
- Use compile-pass/compile-fail fixtures for lifetime, `Send`, and `dyn` claims.
- Required mutants: commit before await, skipped callback, continue after error,
  extra poll after `Ready`, lost item after `Pending`, and eager adapter work.
- Run stable and exact Rust 1.85 archives with fixed authored sources and no
  dependency or path overrides. Compare both ZIPs and run fmt, locked/offline
  check/test/clippy, starter rejection, example execution, and controlled
  mutants.
- Add the verifier to existing `verify` and `workspace-msrv` jobs without
  removing fuzz, profile, or Miri jobs. Emit JSON evidence with archive hash,
  toolchain, and fixture results.
- Keep package/sequence limits bounded (32 records, 4096 bytes, controlled poll
  sequences); a process timeout is verifier failure, never a passing mutant.
- Add E2E module search, gate/reveal/resume, offline ZIP, and console-error
  coverage plus keyboard review.

## Non-goals

No unsafe code, nightly async APIs, custom runtime, new production dependencies,
distributed exactly-once semantics, automatic rollback of arbitrary effects,
performance guarantees for boxed dispatch, or cancellation of arbitrary blocking
work. This milestone does not close the broader release Hold, pilot, allocation,
advisory/license, or full fuzz curriculum gaps.

## Sequencing and review

1. Implement content, project archive, verifier, tests, docs, and CI wiring with
   GPT-5.6-Luna (high).
2. Run focused and full verification on stable and Rust 1.85.
3. Request GPT-6-Astra (medium) qualitative review against this plan and the
   course requirements audit.
4. Fix review findings with Luna, rerun the verification suite, then commit,
   push, open, and merge the milestone PR with English Git metadata.
