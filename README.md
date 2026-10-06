# Rust Workshop

Current catalog: 177 lessons, 45 modules, 180 concepts, 132 blank-page tasks, 318 sources, and 13 downloadable Cargo projects. Runtime allocation evidence is scoped to an authored single-process `GlobalAlloc` probe and does not claim RSS or a universal threshold.

An interactive Rust learning application for someone who knows the basics of programming but is starting Rust from zero. The repository contains 177 lessons in 45 modules, 180 concepts, 132 blank-page tasks, 7 memory traces, 318 source entries, and 13 projects, each with a downloadable Cargo package. Learning progresses from prediction through experimentation and compiler interpretation to independent projects.

The curriculum includes public API design, Cargo workspaces and dependency policy, variance and HRTB callbacks, concurrency and Tokio, and projects such as Number Guessing+, Log Analyzer, Mini grep, and Frame Protocol. Cargo manifest exercises assess TOML declarations locally; separate maintainer checks verify actual features, archives, and compiler floors.

The API Release Matrix module adds two Polish lessons on classifying old-client observations and approving provenance-bearing feature/MSRV evidence. Each lesson has a gate, an independent blank-page task, and a delayed retrieval. The trusted `content:api-release` verifier runs the authored library and external old client on stable and exact Rust 1.85.0, checks default/no-default/opt-in feature configurations, rejects controlled compile and behavior mutants, and writes scoped JSON evidence. Browser tasks model the decision contract and do not replace Cargo or external-crate evidence.

The GAT module adds four lessons on receiver-bound item families, overlapping mutable windows, associated capabilities, and lazy adapters returning owned reports. Eight primary/blank gates and four separate coding retrievals use standard-library Rust. Fixed authored tests check correct alternatives and compiling behavioral mutants on stable and Rust 1.85.0. The separate async lending module covers borrowed futures and dispatch boundaries; unsafe abstractions, performance, and professional readiness remain broader scopes. Current verification results and their scope are described in the [verification report](docs/verification.md).

The async lending milestone adds five Polish lessons on borrowed futures, sequential `AsyncFnMut` callbacks, cancellation before cursor commit, `Send + 'static` dispatch, and an explicit boxed adapter. It extends the existing `tokio-service-workshop` with bounded packet ownership, controlled `Pending -> Ready`, owned reports, a local callback example, compile-fail lifetime/Send/dyn fixtures, and stable/exact Rust 1.85 archive verification. It does not promise rollback of callback effects, exactly-once delivery, or cancellation of arbitrary blocking work.

The property-testing module adds four Polish lessons on executable invariants, bounded valid/malformed generators, shrinking and replay, and metamorphic relations. Eight primary/blank gates and four coding retrievals use independent fixed Rust fixtures. The downloadable `property-contracts-workshop` package uses exactly Proptest 1.11.0 as a development dependency and verifies a checked-in regression plus a controlled mutant. The module covers a bounded property-testing workflow; broader fuzzing, performance evidence, and production test strategy remain open.

The fuzz evidence lifecycle adds four Polish lessons on raw-byte framing, oracle sensitivity, counterexample reduction and campaign provenance. Eight primary/blank gates and four independent retrievals use authored browser fixtures. Mini grep now carries a shared std-only harness adapter, a stable byte-level regression, `FUZZ-MANIFEST.json`, `FUZZ-EVIDENCE.md` and a pinned nightly campaign verifier. The latest assessment and offline hardening is committed as `38fbdb061336a222b6db077630b1fd4c0943ca74`; authored checks require separate regression/replay evidence, named mutant failures, full row identity, and assisted-primary mastery invariance after reveal. Replay is kept separate from generated campaign evidence; local campaign execution remains unverified when `cargo-fuzz` is unavailable, the new browser scenario remains unexecuted under local Chromium limits, and a finite run does not prove absence of bugs. Release remains Hold.

The Performance Evidence module adds four Polish lessons on measured workloads, borrowed streams, bounded buffers, and evidence-based decisions. Eight primary/blank gates and four coding retrievals use deterministic Rust fixtures without wall-clock pass/fail. The Log Analyzer package includes a dev-only Criterion 0.5.1 benchmark and a result-shape contract; the verifier runs the benchmark on stable and exact Rust 1.85.0, but this module does not publish a universal timing claim.

The Profile Evidence module adds four Polish lessons on bounded instruction records, allocation event models, same-workload comparisons, and regression decisions. It contributes eight gates, four blank-page tasks, and four coding retrievals. The Log Analyzer package now contains a 20-file source-model and allocation contract plus `PROFILE-MANIFEST.json`; `content:profiles` checks the authored workload, runs stable or exact Rust 1.85.0, rejects a controlled source-model mutant, and can collect fresh Linux Callgrind or DHAT output. CI runs both Valgrind modes in a dedicated job and uploads the reports as short-lived artifacts. The source contract records assumptions and reports setup separately; external profiles cover the whole test process and cannot attribute samples exclusively to the parser. The separate `content:allocations` verifier now covers the authored runtime probe, eight workloads and a materialization mutant without RSS or universal-threshold claims.

The Unsafe/FFI module adds four Polish lessons on raw-pointer preconditions, disjoint mutable regions, `#[repr(C)]` value validation, and RAII for an opaque foreign handle. Its tenth project is the authored `ffi-buffer-workshop` package: a small C ABI, checked Rust wrapper, native integration tests, and a safety ledger. Stable and exact Rust 1.85.0 verification compile and run this checked-in package; Miri is deliberately not claimed because this fixture crosses a native C allocator boundary and the repository has no reproducible Miri job for it. Broader unsafe abstraction variance and concurrency modeling remain open.

The Service Operations module adds four Polish lessons on trust-boundary admission, allowlisted correlated telemetry, readiness/drain accounting, and evidence-first incident diagnosis. Its authored `service-operations-workshop` package pins Tokio 1.53.1 and includes contract tests, controlled mutants, a threat model, and an incident runbook. Stable and exact Rust 1.85.0 verification regenerate and compare both ZIP archives before running Cargo checks; the package does not execute learner or imported code and does not claim a production telemetry backend or cancellation of arbitrary blocking work.

The Miri Safety module adds four Polish lessons on initialized `ByteView` construction, disjoint mutable regions, `MaybeUninit` state and `MutSlot` reborrowing. It contributes eight gates, four blank-page tasks, and four coding retrievals. The authored `miri-safety-workshop` package keeps safe library checks separate from three intentionally invalid pure-Rust fixtures; stable and exact Rust 1.85.0 verify the package while pinned nightly Miri interprets the negative fixtures. The verifier records fixture-specific UB diagnostics and never runs their native binaries.

The Dependency Assurance module adds four Polish lessons on dependency graph diagnosis, source/license policy, injected-date advisory exceptions, and artifact-bound release decisions. It contributes eight evidence gates, four blank-page tasks, and four coding retrievals. The Frame Protocol package includes a restricted verifier, duplicate evidence, an exception ledger, a pinned offline snapshot, extracted package checks, and an external consumer. `publish = false` remains required; because this fixture has no pinned cargo-deny binary/database, the result is explicitly `unsupported/infrastructure` and the release decision remains on hold.

The current catalog validates as content 177/180/7 with 318 sources, 13 projects, and 132 blank-page tasks across 45 modules. The focused checks cover content validation, authored source-model, runtime allocation and Miri contracts, API release evidence, stable/MSRV archive verification, controlled mutants, the bounded fuzz evidence dossier, the bounded supply-chain dossier, and fresh external profiles when Valgrind is available. The fuzz dossier validates current artifact hashes and run provenance; local campaign execution remains infrastructure-limited when `cargo-fuzz` is unavailable. No Miri result is reported for the native FFI fixture, and no learner pilot or production readiness claim follows from these automated checks.

Repository language convention: commit messages and PR titles/descriptions use English; this README is in English, while the learner-facing course remains in Polish.

## Local setup

Requirements: Node.js `^22.13.0 || >=24` and npm. Stable Rust is required for developer verification of the material and for running the downloaded Cargo project; the application does not run user drafts with a local rustc. The strict TOML parser is pinned to `toml-eslint-parser@1.0.3`; CI uses the current Node.js 22 release.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Progress, drafts, notes, hints, and settings are saved in IndexedDB in this browser. Localhost and 127.0.0.1 are different origins, so they have separate storage. Use the same address or move your progress by exporting it.

Production build with offline support:

```sh
npm run build
npm start
```

The build uses the supported Webpack mode; the default Turbopack in this macOS environment refused to create processes/ports during bundling.

After the first open and resource download, the Service Worker stores the application shell. Materials, answers, and code work offline; Rust execution requires internet access. The browser allows the application to be installed through the install/add-to-home-screen menu. Removing site data removes the local save; a JSON export is a backup.

## Flow

- Onboarding and four diagnostic activities without blocking access to lessons.
- A dashboard with the precisely resumed session, reviews, project, concept states, and cross-cutting competencies.
- A map of 43 modules with lesson-topic search, contracts, a dependency graph, and independence criteria leading to specific tasks. Search is case-insensitive and ignores Polish diacritics while preserving the module selection and learning position.
- A locally served Monaco editor, an alternative text editor, and Rust 2024 execution and tests.
- The compiler's original stderr and a separate Compiler Coach with progressive hints.
- Stack/heap models with steps for move, Copy, clone, borrowing, scope end, and the lifetime of values and `Rc`/`Weak` allocations.
- Selection of thirteen projects: Number Guessing+ (package `number-guessing-workshop`), Todo CLI, Log Analyzer, the `concurrency-lab-workshop` laboratory for atomic protocols, the `tokio-pipeline-workshop` and `tokio-service-workshop` laboratories, Service Operations (`service-operations-workshop`), Miri Safety (`miri-safety-workshop`), Frame Protocol (package `frame-protocol-workspace`), Mini grep (package `mini-grep-workshop`), Property Contracts (package `property-contracts-workshop`), the `ffi-buffer-workshop` safe C-buffer wrapper, and the bounded `durable-log-service-workspace` capstone. The capstone has three crates and 35 authored files, with twelve behavioral gates and six independent coding reviews; its browser exercises model contracts while the downloaded workspace is checked separately. Tokio pipeline has 7 files and currently 10 Rust tests: 1 private manager test and 9 integration tests; it practices separate buffer and active-child limits, a deadline, and a shutdown report. Service Operations has 9 authored files, five contract tests, six controlled mutants, a threat model, and a runbook for bounded admission, telemetry selection, readiness/drain, and incident evidence. Miri Safety has a safe Rust library, three isolated UB fixtures, stable/MSRV checks, and a pinned-nightly Miri verifier. Todo progresses from an `add/done/list` parser, state in a `Vec`, and two session policies to real files and a terminal program. Log Analyzer now has 15 authored files: 19 functional tests, a dev-only Criterion benchmark, a result-shape contract, a fixed-workload source-model contract, `PROFILE-MANIFEST.json`, and `PERFORMANCE.md`. The atomic laboratory has 10 files: 4 standard tests, 1 doctest, 2 Loom models, and 2 intentional counterexamples; the developer verifier additionally weakens the library and requires the bug to be detected. Property Contracts uses Proptest only for authored package development tests; its library has no runtime dependencies. The FFI package uses a checked-in C fixture and native integration tests; it is an authored teaching artifact and does not make arbitrary foreign code safe. The laboratories are teaching supplements; they do not replace the five target portfolio projects. Projects have separate notes and retrospectives; resuming returns to the current project lesson or the first incomplete one.
- Mini grep teaches merging context windows, bounding `BufRead` input before copying complete lines, applying a path policy, defining a stable CLI contract, and auditing a bounded fuzz evidence lifecycle. The archive has separate library and binary crates, process tests, a path-boundaries document, an independent oracle, a stable binary regression and a nightly-only campaign fixture. Downloading or running local Cargo does not increase mastery.
- Opening or downloading a reference solution counts as assistance for the relevant Todo, Log Analyzer, or laboratory tasks and does not pass exercises. Alternatives with a different format, API, and commands remain available as evidence of independence.
- Loops cover the condition and update in `while`, the value from `loop` and `break`, as well as `continue` and labels. Smart pointers include `Box`, `Deref`, `Drop`, `Rc`, `RefCell`, and `Weak`, along with value lifetimes and handle-count traces. Lifetimes begin with E0106/E0597/E0515 errors and lead to designing borrowing and owned APIs. Closures cover capturing, move, and Fn/FnMut/FnOnce; iterators cover element ownership, laziness, early termination, and a custom next contract. Every new concept has a coding retrieval exercise and independent tasks.
- Concurrency covers all-child completion, moving and borrowing data, mpsc channels, a bounded buffer, recovery of an unsent value, a short Mutex section, and an explicit poisoned-state policy. The examples do not promise scheduler ordering or performance gains.
- Async basics cover four lessons, eight tasks with an evidence gate, four blank-page tasks, and four coding retrieval exercises. Tests observe effects, Pending/Ready, the current Waker, and Drop. A bounded number of manual polls lets learners observe real futures from the standard library; the next module executes a Future in a real Tokio runtime.
- The first nine Tokio lessons cover the current-thread runtime, independent tasks, Send/'static boundaries, JoinHandle results, and five lessons in the flow-and-shutdown module. Every new lesson has two gates, including a blank-page task, and a separate coding retrieval exercise. Channels check capacity, data behavior after cancellation, and draining; time lessons use Tokio's paused clock; `select!` preserves work according to an explicit policy, and shutdown accounts for children without hiding JoinError or panic payloads.
- Four `tokio-network-service` lessons combine real TCP on the IPv4 loopback interface with tests of partial operations. Eight gates, four blank-page tasks, and four reviews check connection ownership, half-close, an absolute deadline, and a permit held by the handler. The `tokio-service-workshop` package develops these contracts into a service with a bounded queue for blocking work and explicit shutdown.
- Multiple-choice questions have a stable order based on the question identifier; earlier answers retain their meaning after a refresh.
- Generics cover `T`/`U` parameters, `impl<T>`, borrowing and moving data, and minimal `PartialEq` and `where` bounds. Traits introduce custom contracts, default methods and overrides, generic consumers, associated types, and borrowed `&dyn Trait` values with the `dyn` compatibility boundary.
- Each of the seven generics and traits concepts has two independent coding tasks with a different contract; after one solution is revealed, the second variant remains available as evidence of independence. The stage also contains three blank-page tasks—generic bounds, a custom `Measure` trait with `Output`, and a reporter list—and seven coding retrieval exercises with tests.
- The testing module teaches assertion helpers with case tables, regression tests at boundaries and with Unicode, and separating unit/integration/doc tests from `cargo fmt` and Clippy. Hidden tests run correct and faulty function pointers through `catch_unwind`; this is a harness mechanism, not a required student-code idiom.
- The Log Analyzer module teaches parsing the `TIMESTAMP LEVEL MESSAGE` format, borrowing messages, propagating I/O errors, and a stable report. The local package adds a limit of 4096 stored line bytes, skips the remainder of an overlong line, and includes tests for CRLF, a final line without LF, duplicates, invalid UTF-8, small `BufRead` fragments, and process errors. Downloading the package only provides exposure to the material; the student runs the local Cargo commands.
- Performance Evidence teaches how to state a workload, preserve borrowed views, reuse a bounded buffer, and interpret a baseline and budget without using elapsed time as a lesson pass/fail signal. The Log Analyzer package adds a dev-only Criterion 0.5.1 benchmark comparing its baseline and borrowed streaming paths, plus a deterministic result-shape contract. This is integration evidence for one package and workload; it does not make a universal timing claim.
- Profile Evidence teaches deterministic cost records, allocation events, same-workload comparisons, and threshold decisions. Its Log Analyzer source-model contract records explicitly unverified assumptions about a bounded 4096-byte parser buffer and zero retained record payload for a fixed 512-record workload, with setup bytes reported separately. The separate `content:allocations` verifier observes the authored runtime allocator probe on eight fixed workloads, including controlled reader errors and exact line boundaries, and rejects a materialization mutant while preserving Summary; it remains bounded to the named process and makes no RSS or universal-threshold claim. `content:profiles -- --profile=callgrind` and `--profile=dhat` require Valgrind and produce fresh external reports; CI runs both modes on Linux and uploads the artifacts. These are whole-test-process observations for the authored fixture and environment, not parser-only attribution or universal speed claims. The baseline/candidate contract checks result equality only; it does not compare profiler samples or allocation counts.
- Reviews combine concept recall, prediction, and short compiler-run error fixes, including collections, Todo, generics, and traits.
- Versioned saves, precise resuming, notes, bookmarks, export/import, themes, and Focus Mode.

Content for later sections is shown as a roadmap. Loops from Part 2, the single-threaded scope of Part 15, and the basic scope of Part 16 are available: threads, scope, channels, Send/Sync, `Arc`/`Mutex`, atomics, basic orderings, and a small Loom laboratory. The available atomics and Loom scope is not a complete proof of the memory model or a guarantee of progress or performance. Part 17 covers Future, await, ownership and cancellation through Drop, the Tokio runtime, tasks, and bounded flow with timeout, `select!`, and graceful shutdown. The pipeline laboratory is a teaching package, not a production server. Partial I/O, bounded frames, progress after cancellation, Stream, and spawn_blocking are also available. Mini grep has completed code, archive, and limited fuzzing checks. Property Contracts adds a bounded property-testing workflow with a Proptest package, checked-in replay, and mutation evidence; it does not represent a full fuzz curriculum. Results for each released catalog are recorded in the verification report.

Remaining work includes production extensions to the Tokio service, live advisory refresh and cargo-deny execution, registry publishing, further public API contracts and abstraction-cost measurements, broader property/fuzz curriculum beyond this bounded lifecycle, broader unsafe abstraction variance and further Parts 16–18. The current FFI verifier does not run learner or imported code, external Playground code, or Miri; its native C fixture is checked by Cargo and integration tests on stable and exact Rust 1.85.0. The Miri package covers a bounded pure-Rust fixture set and does not prove all unsafe programs defined. The profile milestone provides source-level allocation assumptions, whole-process Callgrind/DHAT observations and a separate bounded runtime allocation probe; none establishes a platform-independent threshold or general speed claim. Practical variance and HRTB basics are available after closures, followed by the GAT and lending iterator module. Number Guessing+ extends the first project with a random terminal game and contract tests. The capstone is delivered within a bounded scope: browser gates use modeled contracts, the package verifier accepts only the authored archive, and public release remains Hold until live advisory/license review and both reviewed stable/MSRV archive reports are available. Full property/fuzz scope, live advisory refresh, registry publication, production operations, and the learner pilot remain open. The [target advanced-course map](docs/advanced-curriculum.md) describes mid/senior competencies, dependencies, projects, and required evidence. A comparison of all major requirements with the original brief and the remaining scope is in the [requirements audit](docs/requirements-audit.md). No learner pilot has been conducted; lesson availability does not confirm mastery of the entire topic or professional readiness.

The async lending contract is now implemented within the existing Tokio service package; the remaining items above concern production extensions, broader curriculum coverage, and release evidence.

## Architecture

| Directory         | Responsibility                                                |
| ----------------- | ------------------------------------------------------------- |
| `src/domain`      | Lesson, evaluator, runner-result, and user contracts          |
| `src/content`     | Curriculum data, sources, graph, and prepared memory traces   |
| `src/engine`      | Evidence evaluation, mastery, reviews, and retrieval sessions |
| `src/persistence` | Validation, migration, import/export, and IndexedDB           |
| `src/runner`      | Replaceable adapter for isolated Rust execution               |
| `src/app/api/run` | Input validation and the runner's server boundary             |
| `src/components`  | Data-generated interface                                      |
| `scripts`         | Trusted-example verification and source audit                 |

The exercise definition and evaluator are separate. Program source from a draft or import is never executed by a local compiler or Cargo process. The available `PlaygroundRunner` and configurable `RemoteRunner` implement `RustRunner`. A future `SandboxRunner` can implement the same contract.

## Execution boundaries

The “Uruchom” button sends code and tests to the server route and then to Rust Playground. We do not send notes, a name, the full progress state, or settings. Execution takes place in the provider's sandbox; the local Next server does not execute unknown Rust. Limits and failure behavior are described in [docs/runner.md](docs/runner.md). Testing lessons may catch a helper panic in a hidden harness; this does not mean that the application runs local Cargo.

Rust exercises use one source file, while I/O tests create real files in the runner's temporary directories. Cargo manifest exercises instead parse TOML 1.0 locally: they check declarations, make no runner request, and do not claim Cargo execution. Manifest evidence is tracked separately from Rust evidence. Previewing or downloading the Frame starter exposes the four primary manifest answers; blank tasks and retrieval exercises stay independent. The browser runner does not provide interactive stdin, multi-file Cargo, or persistent files for executed Rust programs. You run downloaded packages yourself: Todo, Log Analyzer, and the atomic and Tokio laboratories have their own instructions, and their local checklists include `cargo test`, `cargo fmt`, and `cargo clippy`. Tokio pipeline has 7 files and currently 10 Rust tests (1 private manager test, 9 integration tests); it uses pinned Tokio and a paused test clock. The Log Analyzer package limits the stored line fragment to 4096 bytes before LF and checks read-error handling; its 19 functional tests cover the library, integration, CLI process, and doctest, while its Criterion benchmark and result-shape contract are checked separately. The atomic laboratory uses shared library code for `std` and Loom; its 10 files contain 4 standard tests, 1 doctest, 2 Loom models, and 2 intentional counterexamples. The developer verifier additionally checks a weakened library variant. The starter intentionally does not pass all tests before implementation; downloading it or following the local checklist is not an automatic passing result in the application. Todo's save uses its own temporary file, but does not promise full resilience to power loss or concurrent authors.

Additional tests are hidden in the learner experience, but their source is part of the open curriculum. This is a learning tool, not a secure examination. The `clone()` restriction is an explicit syntax check, not a complete AST analysis. Free-text explanation grading is self-assessment against a rubric and alone does not earn the highest mastery. Memory traces are prepared teaching models for a specific example, not a debugger for arbitrary code.

## Verification

The suite requires local stable Rust. `npm test` also compiles small, trusted fixtures that check the curriculum verifier.

```sh
npm run lint
npm run typecheck
npm test
npm run content:check
npm run content:rust
npm run content:tokio -- --fetch
npm run content:operations -- --fetch
npm run content:models -- --fetch
npm run content:workspace -- --fetch
npm run content:performance -- --fetch
npm run content:profiles -- --fetch
npm run content:ffi
npm run content:cargo
npm run content:property -- --fetch
npm run content:fuzz -- --fetch
npm run content:manifests
npm run content:audit
npm run build
npx playwright install chromium
npm run test:e2e
```

`content:rust` compiles and runs only trusted, authored examples in the repository. It checks correct starters, expected error classes, solutions—including solutions containing only generic functions—with tests declared in the evaluator, traces, and reviews. For test tasks, it also checks whether the unchanged starter requires correction according to the evaluator: behavior or an explicit source restriction. Missing tests, a timeout, and an infrastructure error are not evidence that a starter was correctly rejected; a required API error must have a source-code diagnostic. Code and contract review supplements these checks. Do not pass imported user drafts to this script.

`content:packages` builds starter and solution ZIP archives from authored project data; it also works before `dev` and `build`. `content:cargo` checks these trusted packages through Cargo, including file tests, doctests, integration tests, and launched CLI processes. It is not intended to execute arbitrary code or paths supplied by the user.

`content:performance -- --fetch` checks only the authored Log Analyzer performance archive. It validates the package identity and benchmark/contract files, fetches Criterion 0.5.1 when requested, then runs formatting, all-target checks, the deterministic result-shape contract, and the Criterion benchmark offline and locked. `--msrv` pins Cargo, rustc, and rustdoc to exact Rust 1.85.0. The benchmark proves that the paths can be compared and produce the same result shape; it does not enforce a universal timing threshold or claim a general speedup.

`content:profiles` checks the authored Log Analyzer profile archive. It regenerates and compares both served ZIP variants, validates `PROFILE-MANIFEST.json`, runs formatting, locked/offline checks, the fixed source-model contract, and the controlled source-model mutant. Add `--fetch` before offline checks and `--msrv` for exact Rust 1.85.0. Add `--profile=callgrind` or `--profile=dhat` only in an environment with Valgrind; each mode runs the authored test binary and requires one fresh non-empty report, refusing stale checked-in fixtures. The report covers the whole test process, including setup, assertions, and teardown; the separate `content:allocations` probe covers the named parser call, strict JSON result schema, eight fixed workloads, controlled reader error, exact 4096/4097 boundaries and simulated failed realloc. Neither report claims RSS, retained memory for the whole process or a universal threshold. CI executes both profile modes on Linux and stores their reports as artifacts for seven days.

`content:property -- --fetch` checks only the authored Property Contracts archive. It verifies the exact Proptest 1.11.0 lockfile, starter failure, solution tests, replay of the checked-in regression, formatting, Clippy, and a controlled mutant that must be rejected. `--msrv` selects exact Rust 1.85.0. The package library is std-only and has no runtime dependencies; Proptest is a development dependency used by the authored tests. The verifier accepts no learner code, paths, or dependency overrides.

`content:ffi` checks only the authored `ffi-buffer-workshop` archive. It regenerates and compares both served ZIP variants, then checks the solution with Cargo formatting, locked offline target checks, native integration tests, and Clippy. The CI stable and MSRV jobs run this verifier before the generic archive verifier. Miri is not part of the policy: this package deliberately crosses a compiled C ABI and allocator boundary, and no supported reproducible Miri fixture is claimed.

`content:miri -- --stable --fetch` checks the authored `miri-safety-workshop` package with the selected stable compiler; use `--msrv` for exact Rust 1.85.0. Both modes validate the safe package and compile the fixed negative fixtures for metadata only. Each mode then runs the safe tests and controlled mutant through Cargo and invokes only the pinned `nightly-2026-08-08` Miri toolchain for the isolated UB binaries. The verifier requires a fixture-specific source filename and diagnostic, and accepts no learner code, paths, dependency overrides, or arbitrary toolchains.

`content:operations -- --fetch` checks only the authored `service-operations-workshop` archive. It regenerates and compares both served ZIP variants, fetches Tokio 1.53.1 when requested, then runs formatting, locked offline checks, tests, Clippy, and six controlled contract mutants. The stable and exact Rust 1.85.0 CI jobs run this verifier before generic Cargo archive checks. It accepts no learner code, imported state, paths, or dependency overrides.

`content:workspace -- --fetch` fetches the authored Frame Protocol lockfile, then checks the archive offline with locked dependencies. It inspects default and all-feature graphs, library/client/workspace feature configurations, tests, fmt, Clippy, rustdoc, and the library's generated crate archive. The default graph has only the workspace members; optional serde adds seven registry packages to the lockfile. The `--fetch --msrv` variant uses exactly Rust 1.85.0; install it with `rustup toolchain install 1.85.0 --profile minimal --component rustfmt --component clippy`. CI checks both stable and this lower bound. The library remains `publish = false`; packaging is a local rehearsal, with no crate upload. The `rust-version` declaration alone does not prove compatibility, and this check does not promise identical build output on every platform.

`content:supply-chain -- --fetch` checks the authored Frame Protocol solution ZIP after extraction: authored `deny.toml` source/license settings, the synthetic duplicate fixture beside an actual runtime `cargo tree` observation, advisory ledger fields, release hashes, the ZIP listing, `publish = false`, and a Cargo external consumer compiled from the extracted path dependency. The verifier does not run cargo-deny or claim a `.crate` archive; its snapshot is explicitly `unsupported/infrastructure`, so the release decision remains hold. It accepts only `--fetch` and `--msrv`.

`content:manifests` checks the fixed, authored exercise manifests with the browser's TOML 1.0 adapter and real Cargo metadata. `content:manifests -- --msrv` repeats the Cargo checks on 1.85.0. The syntax corpus records the expected difference: Cargo 1.94+ accepts TOML 1.1, while the course parser retains TOML 1.0 for compatibility with the supported floor. These commands accept no learner source, file paths, or arbitrary toolchains.

`content:fuzz` verifies only the exact Mini grep archive: an independent oracle, a libFuzzer campaign limited to 20000 runs or 30 seconds (inputs up to 4096 bytes), a fixed mutant, and replay of the saved case after restoring the reference. It requires `cargo-fuzz 0.13.2` in PATH, `nightly-2026-08-08` with rustfmt, and a C++ compiler; the main package remains stable/std-only. On the first run use `npm run content:fuzz -- --fetch` to download pinned dependencies; later steps work offline. The verifier pins compiler paths for child processes as well, without changing the default toolchain. Logs, corpus, and counterexample remain in `test-results/mini-grep-fuzz/`; a separate CI job preserves them as an artifact. Fuzzing small text does not prove large limits, I/O, or path policy—those have separate Cargo tests.

`content:guessing` checks the exact downloaded Number Guessing+ archive: starter, solution, library and process tests, and four intentional bugs. The first run, `npm run content:guessing -- --fetch`, downloads the versions from the authored Cargo.lock (rand 0.10.2); later checks are offline/locked. `npm run content:guessing -- --msrv` runs the same checks on the exact Rust 1.85.0. The script accepts no paths or student code.

`content:models -- --fetch` downloads pinned model dependencies and then verifies the models offline and with locked versions. CI runs this step before `content:cargo`; the atomic laboratory uses the same library code for std and Loom.

`npm run content:audit -- --check-links` additionally checks source availability over the network. The report identifies dynamic information and review dates, missing reviews, and missing source relationships. Diagnostic changes are detected by compiling with the current stable Rust. CI reproduces validation and browser tests.

CI checks PRs to `main` and changes on `main`, uses minimal permissions, and uses actions pinned to full SHAs. Production tests without retries and the offline check use the same build. Dependabot maintains npm and Actions updates, and reports help diagnose failures. CD hosting remains undecided. The [CI/CD description](docs/ci-cd.md) contains commands, merge rules, the branch-protection limitation on the current GitHub plan, and the remaining deployment scope after a hosting provider is chosen.

Lesson-path E2E tests replace external execution with a predictable result so that CI does not depend on Playground availability. The remaining tests check reviews, keyboard use, and accessibility of the main screens. A real-adapter test is a separate smoke test. Results from a specific run and limitations are described in [docs/verification.md](docs/verification.md).

## Schema changes

The current save uses `schemaVersion: 3`; v1 and v2 migrations exist. New lessons retain earlier identifiers, and newly added optional fields are compatible with older versions. Import checks the complete structure and metadata before the user approves replacing the state. Unknown versions are not reset. When adding a transformation, change the version and add a test covering preservation of progress, drafts, and notes.

Execution evidence is separate from screen completion. A failed attempt sends a concept to the queue; repeating the same answer multiple times does not multiply competencies. Retention requires a correct active-recall response after a delay, backed by earlier independent evidence of understanding.

## Real execution and offline checks

With the development server running, `node scripts/smoke-runner.mjs` checks five real API calls: correct output, E0382, passing and failing tests, and a panic. It requires a connection to Playground.

To reproduce the offline test in a separate Chromium browser:

```sh
npm run build
npm start -- --port 3002
# In another terminal:
npm run test:offline
```

The script opens a clean test profile, saves a draft and a note, disables the network, reloads the page, and checks exact resumption. It does not change the user's progress in their browser.
