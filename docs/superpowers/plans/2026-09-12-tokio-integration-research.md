# Tokio integration research

[Polski](2026-09-12-tokio-integration-research.pl.md)

Date: 2026-09-12
Scope: read-only repository inspection and primary-source research. No code was sent to the public Playground, and no learner or imported code was executed locally.

## Decision

Add Tokio in two layers:

1. The std async foundations module is already being built. The next Tokio milestone should use those futures and `.await` basics as a short recap, then focus the browser work on runtime entry, tasks/`JoinHandle`, bounded `tokio::sync::mpsc`, `tokio::select!`, and `tokio::time::timeout`. Use an actual Tokio API in every executable exercise. `std::thread`, `std::sync::mpsc`, and a hand-written executor are not substitutes for the runtime or async channels.
2. The later practical module should own cancellation, backpressure, and graceful shutdown. Its downloadable Cargo package and repository-authored fixtures are the source of truth for dependency versions, feature flags, test behavior, and lifecycle guarantees. The browser runner remains a remote execution surface with a fixed profile; it must never accept a dependency list, Cargo manifest, endpoint, headers, environment, or arbitrary local path from the browser.

The first exercises should avoid network and filesystem APIs. The Playground compiler container has no network connection, and timer/channel/task behavior is enough to teach the lifecycle without introducing external services. A later project can add async I/O behind a local package contract and mocked `AsyncRead`/`AsyncWrite` tests.

## Evidence from this repository

`src/runner/index.ts` sends one JSON object to `https://play.rust-lang.org/execute` with `channel`, `mode`, `edition: "2024"`, `crateType`, `tests`, `backtrace`, and a string `code`. Test mode appends hidden Rust tests into a `#[cfg(test)]` module and uses a library crate. The request and output have explicit byte limits; an upstream failure, timeout, malformed response, or queue rejection is infrastructure feedback.

`src/domain/types.ts` currently models `RunRequest` as `{ code, mode, tests? }` and has no dependency, feature, runtime, or Cargo manifest field. `LessonStep` has a string `code`, `solution`, expected status, and evaluator. `Evaluator` supports `tests`, `exact-output`, `compilation`, and related kinds, but not an async-specific contract. `ProjectPackage` already carries reviewed `Cargo.toml`, `Cargo.lock`, source, tests, and README files.

`scripts/verify-rust.ts` is deliberately source-only: it writes imported repository fixtures to a temporary directory and invokes `rustc --edition=2024`. It has no Cargo dependency resolution and therefore cannot verify `use tokio::...` or `#[tokio::test]`. `scripts/verify-packages.ts` is the suitable pattern for Tokio: it unpacks only the static `projects[].package` archive, checks archive freshness, and runs `cargo fmt`, `cargo check`, `cargo test`, and Clippy with `--offline --locked`. Neither script accepts user paths, learner source, imported files, or command-line code.

`src/content/validate.ts` requires 5–8 steps per lesson, executable evaluators for code steps, nonempty `#[test]` fixtures for a tests evaluator, acyclic lesson/module prerequisites, source IDs, module gate references, and a valid Cargo package shape. Its source URL allowlist currently permits Rust Project docs, the Playground, `github.com/rust-lang/rust`, and the pinned Loom docs path. Tokio sources such as `tokio.rs`, `docs.rs/tokio`, `docs.rs/tokio-util`, and `github.com/tokio-rs/tokio` need an explicit allowlist extension plus validation tests before content can reference them.

## What the official Playground provides

The official service reports the following versions at the time of this review:

- `GET https://play.rust-lang.org/meta/versions` reports stable `rustc 1.98.1`, hash `48a229ceaefd4985c50990b14116b6d856af0985`, date `2026-09-01`; beta is `1.99.0-beta.5` and nightly is `1.100.0-nightly` as dated `2026-09-10`.
- The repository's `main` generated compiler manifest declares `tokio = 1.53.1` and enables `fs`, `full`, `io-util`, `net`, `rt`, `rt-multi-thread`, `sync`, `test-util`, and `time`. It also declares `tokio-util = 0.7.19` with `codec`, `full`, and `io` features. See the generated [`compiler/base/Cargo.toml`](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/Cargo.toml), around the `dependencies.tokio` and `dependencies.tokio_util` entries. This is source evidence for repository `main`, not proof of what the deployed service has loaded.
- As of 2026-09-12, the versioned [`docs.rs/tokio/1.53.1`](https://docs.rs/tokio/1.53.1/tokio/) page and [`tokio-util 0.7.19`](https://docs.rs/tokio-util/0.7.19/tokio_util/) page were current versioned API references; the [`Tokio v1.53.1` release](https://github.com/tokio-rs/tokio/releases/tag/tokio-1.53.1) is dated 2026-07-20.
- The read-only `GET https://play.rust-lang.org/meta/crates` endpoint is the appropriate implementation/release-time check for the deployed crate names and versions. This review did not use a POST or claim a deployed Tokio prelude from that endpoint; do not infer deployed availability from the GitHub `main` manifest alone.
- The generated prelude is updated automatically. The [Playground crate policy](https://github.com/rust-lang/rust-playground/blob/main/CRATE_POLICY.md) says it includes top crates and Rust Cookbook crates, uses recent non-prerelease versions, and updates are sporadic, usually around each stable Rust release. A successful browser compile therefore does not prove a permanent version or feature contract.
- The Playground help says crates in that prelude can be used by `extern crate` or, in Rust 2018 and later, ordinary `use`. The Playground [README](https://github.com/rust-lang/rust-playground/blob/main/README.md) documents no network connection from compiler containers and limits memory, execution time, and container resources.
- The current public request shape is visible in [`ui/src/public_http_api.rs`](https://github.com/rust-lang/rust-playground/blob/main/ui/src/public_http_api.rs): execute requests carry `channel`, `mode`, `edition`, `crateType`, `tests`, `backtrace`, and `code`; `code` can be a single string or a list of named files. Responses contain `success`, `exitDetail`, `code`, `stdout`, and `stderr`. A multi-file `code` value does not make the Playground a general Cargo project interface; the generated prelude remains the dependency/feature source.

These facts identify the real Tokio API surface to verify against the deployed crate listing before release, for example `use tokio::sync::mpsc;`, `tokio::spawn`, `#[tokio::main]`, `tokio::select!`, and `tokio::time::timeout`. They do not justify teaching arbitrary crates, custom Cargo features, networking, or a lockfile through the public endpoint. Recheck `meta/versions`, `meta/crates`, the generated manifest, and the lesson fixtures after each stable or Tokio update.

## API facts that constrain lesson design

The versioned Tokio API documents the following contracts:

- [`tokio::runtime`](https://docs.rs/tokio/1.53.1/tokio/runtime/) distinguishes the current-thread runtime (`rt`) from the multi-thread runtime (`rt-multi-thread`). A manually built runtime needs `block_on`; I/O and timers also require their drivers (`enable_all` is the simple teaching choice). `#[tokio::main]` is the compact application entry point, while `Builder` is for explicit runtime control.
- [`tokio::main`](https://docs.rs/tokio/1.53.1/tokio/attr.main.html) requires `macros` and `rt`; the multi-thread flavor additionally needs `rt-multi-thread`. The Playground's `full` feature covers these. Prefer `#[tokio::test(flavor = "current_thread")]` in deterministic hidden tests unless the lesson specifically teaches the scheduler flavor.
- [`tokio::spawn`](https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn.html) returns a `JoinHandle`. Tokio's tutorial explains that spawned futures require `Send + 'static` for the multi-thread scheduler, and data held across `.await` must be `Send`. A dropped handle detaches the task; an awaited handle reports the task result or a join error after panic/runtime cancellation. Exercises must retain and await every handle they create.
- [`tokio::sync`](https://docs.rs/tokio/1.53.1/tokio/sync/) is runtime-aware synchronization and is feature-gated by `sync`. The [`Tokio channels tutorial`](https://tokio.rs/tokio/tutorial/channels) specifies `mpsc` as multi-producer/single-consumer, `oneshot` as one value, `broadcast` as every receiver seeing values, and `watch` as the latest value only. A bounded `mpsc::channel(capacity)` makes `send().await` wait once the buffer is full, and `recv()` returns `None` only after the channel is closed and all buffered messages have been received.
- [`tokio::select!`](https://docs.rs/tokio/1.53.1/tokio/macro.select.html) waits on concurrent branches and drops the unfinished branch futures when one completes. The tutorial's [select section](https://tokio.rs/tokio/tutorial/select) explicitly defines cancellation by dropping a future. That only cancels work represented by the dropped future: when a branch borrows `&mut` a future or `JoinHandle`, dropping the branch drops the borrow, while a spawned task behind that handle can remain alive. Dropping a `JoinHandle` detaches its task. Teach cancellation safety and branch ownership; do not promise that `select!` cancels a task or infer that it creates parallel tasks. Use `tokio::spawn` for independent task execution, retain each handle, and await it or explicitly abort it.
- [`tokio::time::timeout`](https://docs.rs/tokio/1.53.1/tokio/time/fn.timeout.html) returns `Result<T, Elapsed>` and cancels by dropping the wrapped future. It requires the `time` feature and a runtime timer; it can panic when used without one. Hidden tests should use the test runtime and avoid wall-clock sleeps.
- [`tokio_util::sync::CancellationToken`](https://docs.rs/tokio-util/0.7.19/tokio_util/sync/struct.CancellationToken.html) is a real shared cancellation signal. `cancel()` wakes tasks awaiting `cancelled()`, and cloning gives tasks handles to the same cancellation state. The Tokio [graceful shutdown guide](https://tokio.rs/tokio/topics/shutdown) divides shutdown into detecting the condition, telling every component, and waiting for all components. It demonstrates cancellation tokens and then waiting with `TaskTracker`.
- Tokio's [unit-testing guide](https://tokio.rs/tokio/topics/testing) recommends paused time and documents that `#[tokio::test(start_paused = true)]` needs `test-util`. This is the right way to test timeout/retry behavior without sleeping for real milliseconds. Keep the feature explicit in the package manifest and verify that the browser prelude still exposes it.

## Proposed content and contracts

### Tokio runtime, tasks, and lifecycle milestone

Add this module after the in-progress std async foundations module, with prerequisites that include the existing threads/channels and ownership foundations. Keep each lesson within the existing `Lesson`/`LessonStep` shape and 5–8 steps. Treat futures, laziness, and `.await` as a short prerequisite recap rather than a second full Tokio lesson. A good sequence is:

1. Runtime entry: use `#[tokio::main]` and a current-thread runtime; compare explicit `Builder::new_current_thread().enable_all().build()?.block_on(...)` only after the macro works.
2. Tasks and joins: implement two `tokio::spawn` tasks, keep both handles, await them, and propagate a `JoinError`. Include compile-error variants for borrowed data and a non-`Send` value held across `.await`; teach `move` and `Arc` only where they solve the actual boundary.
3. Tokio message passing: use bounded `tokio::sync::mpsc`, clone `Sender`, process values in one receiver task, drop all sender clones, and prove that the receiver drains buffered values before `None`.
4. Backpressure: make capacity `1`, use a gate/oneshot or deterministic receiver to show `send().await` is pending while full, then make progress. Include `try_send` and its `Full(T)`/`Closed(T)` ownership behavior if the API surface is useful for the exercise.
5. Race and cancellation: use `tokio::select!` with a message and cancellation/timeout future. Make the learner explain which branch future is dropped, whether it owns the underlying operation, and what cleanup the worker must perform. Keep spawned handles owned and awaited; use explicit abort only when the lesson documents it.
6. Recall/transfer: change the message type and the pipeline policy, requiring a fresh bounded Tokio pipeline with all handles joined and a deterministic completion signal.

The module gate should require actual Tokio identifiers in the code contract, behavior tests for closed channels/backpressure, and a retained `JoinHandle` for every spawned task. A code evaluator may use required/forbidden source patterns only to enforce the requested Tokio idiom; behavior remains the primary check.

### Practical async module

The later module should use the exact lifecycle below for a small worker pipeline:

`create runtime → create bounded mpsc → spawn workers with owned inputs → process until message or cancellation → close producer side → signal cancellation → drain/flush policy → await every JoinHandle → assert completion and no unresolved result`

Use `CancellationToken` for cooperative shutdown. A worker should `select!` between `rx.recv()` and `token.cancelled()`, stop accepting new work after cancellation, finish the explicitly documented in-flight item if that is the policy, and return a result. The coordinator must drop all senders, call `cancel`, and await each worker. A timeout around shutdown should report failure rather than silently detach tasks.

Use a project contract such as `tokio-pipeline-workshop` with a small library API and a binary. Required behaviors should include bounded queue capacity, message ownership, cancellation, deterministic completion, error propagation from one worker, and graceful shutdown. Required evidence should include `#[tokio::test(start_paused = true)]`, one backpressure test, one cancellation test, one worker panic/join-error test, and one transfer variant with a different message or capacity. Do not use a network dependency for the first package; use in-memory channels and timers, then generic `AsyncRead`/`AsyncWrite` mocks if async I/O is added.

## Browser/local parity design

The browser runner must keep the `RunRequest` boundary small. Do not add `dependencies: Record<string, ...>` or accept learner-supplied Cargo TOML. If the UI needs to declare that a lesson uses Tokio, add a server-controlled execution profile keyed by a trusted lesson/profile ID, for example `playground-tokio-stable`. The route should validate that profile against a static allowlist and the runner should select the fixed `channel`, `edition`, crate type, and hidden-test policy. Unknown profiles are infrastructure/validation errors. The browser may still send learner `code` and the lesson-owned hidden tests, subject to current limits.

The profile is metadata and routing policy, not proof of a dependency version. The public Playground has a prebuilt dependency set and no request-level feature selection. Therefore:

- Treat browser execution as “Tokio API available in the currently deployed official Playground crate list/prelude after a read-only `meta/crates` confirmation.” The repository `main` manifest is only a compatibility hint.
- Treat the pinned local Cargo package as the compatibility authority: `tokio = "=1.53.1"`, `tokio-util = "=0.7.19"` where used, with an explicit minimal feature list or `full` when the lesson intentionally teaches broad application APIs.
- Record a `playgroundReviewedAt`/toolchain metadata entry in the plan or content manifest if desired, but recheck it rather than treating it as a lock.
- When a lesson depends on a feature that the Playground prelude enables globally, make that dependency explicit in the local package and add a check that the lesson's declared API/feature profile matches the package. A browser success can otherwise hide a missing Cargo feature.
- Keep browser hidden tests deterministic and bounded. Avoid `sleep` on wall time, network, OS signals, unbounded loops, and tests whose result depends on worker scheduling. Use current-thread test flavor, closed channels, oneshot gates, paused time, and explicit result channels.

The current `PlaygroundRunner` can already append `#[tokio::test]` fixtures to one source string. It cannot locally verify that source. Add a separate trusted Cargo verifier rather than changing `verify-rust.ts` to execute arbitrary lesson text through a generated manifest. The separate verifier should import only statically declared Tokio fixtures/project packages, construct a temporary directory, and reject any caller-supplied path, source, manifest, endpoint, or dependency version.

## Trusted Cargo verification pipeline

Use the existing package/archive flow as the baseline:

1. Add a reviewed package definition under `src/content/projects/` with `Cargo.toml`, `Cargo.lock`, `src/lib.rs`/`src/main.rs`, integration tests, and README. The package's starter and solution are both repository-authored values.
2. Extend `src/content/course.ts` to register the project and connect its lesson/reveal references. Keep the package solution reveal as help; downloading or running the package must not mark browser evidence complete.
3. Add a dedicated `scripts/verify-tokio.ts` (or a generalized trusted Cargo fixture verifier) that imports the package/fixtures from the repository, unpacks to a fresh temporary directory, and runs only fixed commands. It must not accept CLI paths or code. Keep `verify-rust.ts` for std-only examples.
4. Verify the archive bytes served by `public/projects/...` match the generated bytes, as `verify-packages.ts` already does.
5. First run `cargo fetch --locked` in a controlled maintainer/CI step, then run verification with `--offline --locked`. Cargo documents that `--locked` rejects lockfile changes and `--offline` prevents network access; together they make the verification input reviewable and reproducible after the cache is populated.
6. Run `cargo fmt --all -- --check`, `cargo check --offline --locked --all-targets`, `cargo test --offline --locked --all-targets --no-fail-fast`, and `cargo clippy --offline --locked --all-targets --all-features -- -D warnings` for the solution. For the starter, require a meaningful failing test or compile failure tied to unfinished behavior; zero tests, timeout, dependency resolution failure, and infrastructure failure are not evidence that the starter is correctly rejected.
7. Assert test counts and named behavioral results, not only exit status. Include malformed/closed channel behavior, capacity one backpressure, paused timeout, cancellation completion, task join error, and a transfer variant. If source idiom matters, use narrow source checks in addition to runtime tests and document what the check cannot prove.
8. Run the trusted verifier in CI with the stable toolchain recorded by the repository. Do not invoke it from a browser request and do not let it inspect `UserState`, imported archives, or editor content.

The Cargo Book confirms that `cargo test` compiles and executes unit, integration, and documentation tests, that `--no-run` only compiles tests, that `--locked` enforces the existing lockfile, and that `--offline` prevents network access. The relevant primary pages are [`cargo test`](https://doc.rust-lang.org/cargo/commands/cargo-test.html), [`cargo check`](https://doc.rust-lang.org/cargo/commands/cargo-check.html), and [`Cargo.toml` versus `Cargo.lock`](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html).

## Suggested file and type work for a future implementation

These are implementation contracts for the next agent, not changes made by this research task:

- `src/domain/types.ts`: add a narrow trusted execution profile reference only if the UI needs to distinguish Tokio lessons. Keep dependency details server-owned; do not expose arbitrary Cargo features or manifests in `RunRequest`.
- `src/runner/index.ts`: keep `PlaygroundRunner` payload compatibility and fixed HTTPS endpoint validation. If profile selection is added, map profile IDs to static server-side policy and preserve current output/timeout/size/concurrency handling.
- `src/app/api/run/route.ts` and route tests: reject unknown profiles and any request fields that attempt to override endpoint/configuration. Add tests proving the route never forwards learner dependency metadata.
- `src/content/validate.ts` and `src/content/content-validation.test.ts`: extend the official source allowlist for `tokio.rs`, `docs.rs/tokio`, `docs.rs/tokio-util`, and `github.com/tokio-rs/tokio`; test accepted and rejected prefixes. Add validation for any new execution-profile ID and package references.
- `src/content/tokio-foundations.ts` and a later Tokio practical module: use existing lesson/module/evaluator contracts, with source IDs for each public API and two independent transfer variants per gate.
- `src/content/projects/tokio-pipeline.ts`, `scripts/verify-tokio.ts`, and the generated `public/projects/tokio-pipeline-workshop/{starter,solution}.zip`: hold the exact local Cargo contract. Keep `Cargo.lock` checked in and the README explicit about the one-time online fetch followed by offline locked commands.
- `scripts/verify-rust.ts`: leave the std-only verifier's safety promise intact. A generalized trusted Cargo helper can share output classification, but must preserve the “repository-authored fixtures only” rule.
- `docs/runner.md`, `docs/verification.md`, and `docs/progress.md`: describe the Playground prelude/version drift, the local Cargo authority, the no-network limitation, the no learner/import execution boundary, and the fact that external Playground smoke remains a separately authorized operation.

## Verification matrix for the module

| Contract | Positive evidence | Required negative case | Deterministic method |
| --- | --- | --- | --- |
| Future laziness and `.await` | Body runs only when awaited; output order is fixed | Missing `.await` leaves an unused future/does not produce expected output | Single current-thread runtime and exact output |
| Runtime entry | `#[tokio::main]` executes async main | Timer API outside enabled runtime fails in a reviewed fixture | `enable_all`; separate expected-error fixture |
| Spawn and ownership | Every handle awaited; values returned through join | Borrow across spawned task / non-`Send` across `.await` is rejected | Compile-error fixture tied to E0373/E0277 plus join test |
| Bounded mpsc | Capacity is honored; sender ownership and receiver close are correct | Dropped sender too early or receiver never closes; unsent `T` is lost | Capacity 1, oneshot gate, explicit drop, no wall sleep |
| Backpressure | `send().await` makes progress only after receiver consumes | `try_send` mishandles `Full(T)` or `Closed(T)` | Test a full queue before releasing receiver |
| `select!` and cancellation | Winner is handled; losing branch future drop semantics are explained | Borrowed future/`JoinHandle` leaves its underlying task alive, or a dropped handle detaches it | Owned future branch, or a token/abort signal with an explicitly retained and awaited task handle |
| Timeout | Completion and `Elapsed` paths map to explicit results | Missing timer driver or ignored timeout | `#[tokio::test(start_paused = true)]` and `advance`/timeout |
| Graceful shutdown | Signal, notify, and await all workers; flush policy is explicit | Coordinator drops handles or leaves sender/task alive | CancellationToken, closed channel, joined handles, shutdown timeout |
| Transfer | New message type/capacity still satisfies the lifecycle | Hard-coded original values or std channel substitution | Fresh hidden tests plus narrow source checks |

## Explicit boundary and non-actions

This research did not POST or retry code to `play.rust-lang.org`; the earlier external transmission was rejected and remains unauthorized. Public GET documentation and metadata were read only. No learner code, imported code, or arbitrary user path was executed locally. Future implementation should preserve those boundaries and request separate authorization before any external Playground smoke test.
