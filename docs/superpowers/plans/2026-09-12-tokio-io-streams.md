# Tokio I/O, streams and blocking work implementation plan

> **For agentic workers:** Use subagent-driven-development with independent authors and review before integration.

**Goal:** Teach partial asynchronous I/O, bounded framing, retained progress across cancellation, streams, and the blocking-pool boundary through executable contracts.

**Architecture:** Extend the existing data-driven course with `tokio-io-streams` and `tokio-blocking-work`. Keep lesson authors separate from module registration and verification. Reuse the reviewed Tokio fixture profile and existing local-first workspace.

**Tech stack:** Rust 2024, Tokio =1.53.1, tokio-stream =0.1.19, existing Next.js application.

**Spec:** Original product brief and `docs/advanced-curriculum.md`; this is one bounded stage of the ongoing approved curriculum development.

## Constraints

- Learner starts Rust from zero with basic programming knowledge; no prior-language bridge.
- Each concept has two distinct coding gates and a fresh coding review. A revealed solution cannot satisfy an independent gate.
- Tests observe actual bytes, ownership, errors, polls and resource lifetimes. Sleeps or a watchdog firing are not correctness evidence.
- Only reviewed repository-authored Rust is compiled locally. No external runner POST is part of this verification.
- Tokio `duplex` demonstrates I/O traits, not a deployed TCP service. Network architecture remains a separate portfolio extension.

## 1. Repair verified CI failure and extend the fixture profile

Files: `scripts/verify-rust.ts`, verifier tests, `src/domain/trusted-fixtures.ts`, `scripts/fixtures/tokio-runtime-1.53.1/`, source allowlist.

- [x] Preserve evidence from CI run 34720429657: first authored rustc compile ended with ETIMEDOUT under the shared 8-second compile/run limit.
- [x] Separate compile budget (60 seconds, matching the Cargo verifier) from execution budget (8 seconds); keep timeouts as failures.
- [x] Regression-test compile/runtime timeout outcomes and Tokio Stream-only authoring metadata.
- [x] Pin tokio-stream 0.1.19 and enable Tokio io-util. Refresh the fixed lockfile and test real duplex and ReceiverStream in profile preflight.

## 2. Partial I/O and retained framing

File: `src/content/tokio-io.ts` (I/O author).

- [x] Full write + flush; independent bounded transfer preserves unread suffix and errors.
- [x] Two-byte big-endian frame length: clean EOF differs from truncated header/body. Validate limits before allocation or any output.
- [x] Retain read state and write offsets outside a cancellable future. Test retry without losing bytes or duplicating a prefix.
- [x] Cover chunked reads/writes, empty payload, zero limit, oversized length, injected errors and cancellation through controlled polls.

## 3. Streams and owned items

File: `src/content/tokio-streams.ts` (stream author).

- [x] Demonstrate Stream item, Pending and terminal None, including pinned !Unpin stream support.
- [x] Bound consumption without polling or taking an extra item; test non-Copy payloads.
- [x] Use real ReceiverStream close/drain behavior and precisely scoped next cancellation semantics.
- [x] Provide two independent gates and code review for each lesson, not duplicated wrappers.

## 4. Blocking work

File: `src/content/tokio-blocking.ts` (blocking author).

- [x] Use actual spawn_blocking and propagate JoinError; keep ownership and Send/'static at the worker boundary.
- [x] Transfer to an async consumer that can borrow local non-Send state.
- [x] Prove started blocking work needs cooperative shutdown; abort is not its completion.
- [x] Acquire a semaphore before spawning and retain the permit inside the closure through real completion, including panic.

## 5. Registration, review, release

Files: module contracts, `src/content/course.ts`, integration/E2E/offline tests, PWA cache version, audit and verification documents.

- [x] Register lesson/concept/source/review arrays and explicit independent gate references. Verify module prerequisites and assessment references.
- [x] Review authored Rust against pinned documentation and run compiling behavioral mutants for fragile contracts.
- [x] Run lint, typecheck, Vitest, content validation, all authored std/Tokio examples, Cargo package checks and source audit.
- [x] Run build, browser flow, keyboard/console and offline resume checks. Update the requirements audit with exact scope and remaining gaps.
- [x] Prepare the verified milestone for commit and push; inspect its CI after publishing. Commit and remote status are recorded in Git/GitHub. PR #1 is already merged (64667e4), so no second merge is implied.
