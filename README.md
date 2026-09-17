# Rust Workshop

An interactive Rust learning application for someone who knows the basics of programming but is starting Rust from zero. The repository contains 130 lessons in 35 modules, 133 concepts, 85 blank-page tasks, 7 memory traces, 266 source entries, and 8 projects, each with a downloadable Cargo package. Learning progresses from prediction through experimentation and compiler interpretation to independent projects.

The curriculum includes public API design, Cargo workspaces and dependency policy, variance and HRTB callbacks, concurrency and Tokio, and projects such as Number Guessing+, Log Analyzer, Mini grep, and Frame Protocol. Cargo manifest exercises assess TOML declarations locally; separate maintainer checks verify actual features, archives, and compiler floors.

The GAT module adds four lessons on receiver-bound item families, overlapping mutable windows, associated capabilities, and lazy adapters returning owned reports. Eight primary/blank gates and four separate coding retrievals use standard-library Rust. Fixed authored tests check correct alternatives and compiling behavioral mutants on stable and Rust 1.85.0. These lessons do not claim complete coverage of async lending, unsafe abstractions, performance, or professional readiness. Current verification results and their scope are described in the [verification report](docs/verification.md).

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
- A map of 35 modules with lesson-topic search, contracts, a dependency graph, and independence criteria leading to specific tasks. Search is case-insensitive and ignores Polish diacritics while preserving the module selection and learning position.
- A locally served Monaco editor, an alternative text editor, and Rust 2024 execution and tests.
- The compiler's original stderr and a separate Compiler Coach with progressive hints.
- Stack/heap models with steps for move, Copy, clone, borrowing, scope end, and the lifetime of values and `Rc`/`Weak` allocations.
- Selection of eight projects: Number Guessing+ (package `number-guessing-workshop`), Todo CLI, Log Analyzer, the `concurrency-lab-workshop` laboratory for atomic protocols, the `tokio-pipeline-workshop` and `tokio-service-workshop` laboratories, Frame Protocol (package `frame-protocol-workspace`), and Mini grep (package `mini-grep-workshop`). Tokio pipeline has 7 files and currently 10 Rust tests: 1 private manager test and 9 integration tests; it practices separate buffer and active-child limits, a deadline, and a shutdown report. Todo progresses from an `add/done/list` parser, state in a `Vec`, and two session policies to real files and a terminal program. Log Analyzer progresses through a borrowed record, streaming analysis, and a deterministic report; its 10-file Cargo package uses only the standard library and contains 19 tests: 11 unit, 5 integration, 2 CLI process, and 1 doctest. The atomic laboratory has 10 files: 4 standard tests, 1 doctest, 2 Loom models, and 2 intentional counterexamples; the developer verifier additionally weakens the library and requires the bug to be detected. The laboratories are teaching supplements; they do not replace the five target portfolio projects. Projects have separate notes and retrospectives; resuming returns to the current project lesson or the first incomplete one.
- Mini grep teaches merging context windows, bounding `BufRead` input before copying complete lines, applying a path policy, and defining a stable CLI contract. The archive has separate library and binary crates, process tests, and a path-boundaries document. Downloading or running local Cargo does not increase mastery.
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
- Reviews combine concept recall, prediction, and short compiler-run error fixes, including collections, Todo, generics, and traits.
- Versioned saves, precise resuming, notes, bookmarks, export/import, themes, and Focus Mode.

Content for later sections is shown as a roadmap. Loops from Part 2, the single-threaded scope of Part 15, and the basic scope of Part 16 are available: threads, scope, channels, Send/Sync, `Arc`/`Mutex`, atomics, basic orderings, and a small Loom laboratory. The available atomics and Loom scope is not a complete proof of the memory model or a guarantee of progress or performance. Part 17 covers Future, await, ownership and cancellation through Drop, the Tokio runtime, tasks, and bounded flow with timeout, `select!`, and graceful shutdown. The pipeline laboratory is a teaching package, not a production server. Partial I/O, bounded frames, progress after cancellation, Stream, and spawn_blocking are also available. Mini grep has completed code, archive, and limited fuzzing checks; results for each released catalog are recorded in the verification report.

Remaining work includes production extensions to the Tokio service, advanced dependency conflict diagnosis, registry publishing, supply-chain policy, further public API contracts and abstraction-cost measurements, a full property/fuzz curriculum, benchmarks, async lending, unsafe abstraction variance, and further Parts 16–18. Practical variance and HRTB basics are available after closures, followed by the GAT and lending iterator module. Number Guessing+ extends the first project with a random terminal game and contract tests; the capstone remains planned. The [target advanced-course map](docs/advanced-curriculum.md) describes mid/senior competencies, dependencies, projects, and required evidence. A comparison of all major requirements with the original brief and the remaining scope is in the [requirements audit](docs/requirements-audit.md). No learner pilot has been conducted; lesson availability does not confirm mastery of the entire topic or professional readiness.

## Architecture

| Directory | Responsibility |
| ----------------- | ------------------------------------------------------------ |
| `src/domain` | Lesson, evaluator, runner-result, and user contracts |
| `src/content` | Curriculum data, sources, graph, and prepared memory traces |
| `src/engine` | Evidence evaluation, mastery, reviews, and retrieval sessions |
| `src/persistence` | Validation, migration, import/export, and IndexedDB |
| `src/runner` | Replaceable adapter for isolated Rust execution |
| `src/app/api/run` | Input validation and the runner's server boundary |
| `src/components` | Data-generated interface |
| `scripts` | Trusted-example verification and source audit |

The exercise definition and evaluator are separate. Program source from a draft or import is never executed by a local compiler or Cargo process. The available `PlaygroundRunner` and configurable `RemoteRunner` implement `RustRunner`. A future `SandboxRunner` can implement the same contract.

## Execution boundaries

The “Uruchom” button sends code and tests to the server route and then to Rust Playground. We do not send notes, a name, the full progress state, or settings. Execution takes place in the provider's sandbox; the local Next server does not execute unknown Rust. Limits and failure behavior are described in [docs/runner.md](docs/runner.md). Testing lessons may catch a helper panic in a hidden harness; this does not mean that the application runs local Cargo.

Rust exercises use one source file, while I/O tests create real files in the runner's temporary directories. Cargo manifest exercises instead parse TOML 1.0 locally: they check declarations, make no runner request, and do not claim Cargo execution. Manifest evidence is tracked separately from Rust evidence. Previewing or downloading the Frame starter exposes the four primary manifest answers; blank tasks and retrieval exercises stay independent. The browser runner does not provide interactive stdin, multi-file Cargo, or persistent files for executed Rust programs. You run downloaded packages yourself: Todo, Log Analyzer, and the atomic and Tokio laboratories have their own instructions, and their local checklists include `cargo test`, `cargo fmt`, and `cargo clippy`. Tokio pipeline has 7 files and currently 10 Rust tests (1 private manager test, 9 integration tests); it uses pinned Tokio and a paused test clock. The Log Analyzer package limits the stored line fragment to 4096 bytes before LF and checks read-error handling; its 19 tests cover the library, integration, CLI process, and doctest. The atomic laboratory uses shared library code for `std` and Loom; its 10 files contain 4 standard tests, 1 doctest, 2 Loom models, and 2 intentional counterexamples. The developer verifier additionally checks a weakened library variant. The starter intentionally does not pass all tests before implementation; downloading it or following the local checklist is not an automatic passing result in the application. Todo's save uses its own temporary file, but does not promise full resilience to power loss or concurrent authors.

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
npm run content:models -- --fetch
npm run content:workspace -- --fetch
npm run content:cargo
npm run content:fuzz -- --fetch
npm run content:manifests
npm run content:audit
npm run build
npx playwright install chromium
npm run test:e2e
```

`content:rust` compiles and runs only trusted, authored examples in the repository. It checks correct starters, expected error classes, solutions—including solutions containing only generic functions—with tests declared in the evaluator, traces, and reviews. For test tasks, it also checks whether the unchanged starter requires correction according to the evaluator: behavior or an explicit source restriction. Missing tests, a timeout, and an infrastructure error are not evidence that a starter was correctly rejected; a required API error must have a source-code diagnostic. Code and contract review supplements these checks. Do not pass imported user drafts to this script.

`content:packages` builds starter and solution ZIP archives from authored project data; it also works before `dev` and `build`. `content:cargo` checks these trusted packages through Cargo, including file tests, doctests, integration tests, and launched CLI processes. It is not intended to execute arbitrary code or paths supplied by the user.

`content:workspace -- --fetch` fetches the authored Frame Protocol lockfile, then checks the archive offline with locked dependencies. It inspects default and all-feature graphs, library/client/workspace feature configurations, tests, fmt, Clippy, rustdoc, and the library's generated crate archive. The default graph has only the workspace members; optional serde adds seven registry packages to the lockfile. The `--fetch --msrv` variant uses exactly Rust 1.85.0; install it with `rustup toolchain install 1.85.0 --profile minimal --component rustfmt --component clippy`. CI checks both stable and this lower bound. The library remains `publish = false`; packaging is a local rehearsal, with no crate upload. The `rust-version` declaration alone does not prove compatibility, and this check does not promise identical build output on every platform.

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
