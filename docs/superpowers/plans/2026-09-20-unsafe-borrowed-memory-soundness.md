# Unsafe Borrowed Memory Soundness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded, executable Rust curriculum milestone for reviewing the soundness of unsafe borrowed-memory abstractions, with independent compile/runtime/Miri evidence and explicit limits on what that evidence proves.

**Architecture:** Add one four-lesson module after `unsafe-miri-contracts`. Browser exercises remain authored, std-only Rust contracts evaluated by the existing isolated runner; they never execute learner or imported unsafe code. A restricted verifier compiles only checked-in fixture strings on stable and Rust 1.85.0, runs the named safe tests and compile-fail controls, and invokes the pinned nightly Miri toolchain only for isolated authored UB fixtures. Reuse the existing schema v3, lesson evidence engine, Miri reporting conventions, and release Hold.

**Tech Stack:** Existing TypeScript content model, Vitest, Playwright, Node child-process verifier, Rust 2024, stable Rust and exact Rust 1.85.0, pinned nightly-2026-08-08 Miri, rustfmt and Clippy.

**Spec:** `docs/advanced-curriculum.md` (the open unsafe-abstraction-variance and soundness scope), `docs/requirements-audit.md`, `docs/verification.md`, `docs/superpowers/plans/2026-09-13-borrowed-callbacks.md`, and `docs/superpowers/plans/2026-09-17-gat-lending-iterators.md`.

## Global Constraints

- Preserve `schemaVersion: 3`, every existing lesson/concept/project ID, drafts, notes, mastery semantics, reveal policy, and delayed retrieval behavior.
- All learner-facing lesson prompts, hints, explanations, choices, and feedback are Polish. README, verifier output fields, CI names, reports, commits, and this plan are English.
- Keep the exact stable floor Rust 1.85.0. Pinned nightly is used only for the named Miri fixtures and is never reported as an MSRV result.
- Execute only authored fixture source in maintainers' local and CI verification. Never pass learner text, imported files, arbitrary paths, or arbitrary toolchains to the verifier.
- The browser runner remains single-file and safe for authored contracts. Do not add a general unsafe-code runner, an FFI runner, or a multi-file learner build path.
- Every accepted unsafe operation has a written safety invariant and a caller precondition. A `#[allow(unsafe_code)]`, a marker type, or a passing compilation alone is not evidence of soundness.
- Compile errors, Miri setup errors, timeouts, missing diagnostics, and incomplete phase reports are infrastructure or failed evidence; they never count as successful mutant rejection or a green campaign.
- Do not execute UB intentionally in the browser, in the stable verifier, or in a learner package. Miri may interpret only isolated, checked-in negative fixtures whose expected diagnostic and identity are pinned.
- No new production dependency, public API compatibility claim, FFI trust claim, universal memory-safety claim, performance claim, or professional-readiness claim.
- Preserve the release status `Hold`; this milestone does not replace advisory/license review, a human pilot, or a complete Rust memory-model proof.
- Read the applicable `AGENTS.md` and the relevant Next guide before changing application code. This plan adds content and verification paths; it does not require a Next route or runner change.

## Scope and decisions

The milestone closes the explicit gap between practical raw-pointer/`MaybeUninit` exercises and reviewing an unsafe borrowed-memory abstraction as a whole. It does not repeat the existing `unsafe-ffi-contracts` C ABI/RAII work or the existing `unsafe-miri-contracts` `ByteView`, `Slot<T>`, and simple disjoint-slice contracts. The new contracts use different names, data shapes, and failure modes.

The module has four ordered lessons and eight primary coding gates (two per lesson), four independent code-evaluated retrievals, four lesson-local recall tasks, and one fresh blank task per lesson. The primary and blank tasks must be independently assessed; a revealed primary cannot satisfy its blank or retrieval. Each task has a distinct authored fixture and at least one compiling semantic mutant that the hidden tests reject.

The four contracts are:

1. **Provenance and lifetime boundary.** `BorrowedRegion<'a>` wraps a raw byte range using `NonNull<u8>`, a `usize` length, and `PhantomData<&'a [u8]>`. `unsafe fn from_raw_parts<'a>(raw: *const u8, len: usize) -> Option<BorrowedRegion<'a>>` accepts a null pointer only for `len == 0`, rejects `len > isize::MAX`, rejects a wrapped end address, and never extends the lifetime of the backing allocation. Tests use valid local allocations, empty null views, multibyte lengths, and a compile-fail lifetime escape.
2. **Mutable reborrow and disjointness.** `split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>` accepts `0..=len`, including empty sides, and rejects `mid > len` before creating views. A separate `reborrow<'short>(&'short mut BorrowedRegion<'a>)` contract proves that the outer loan may shorten while the borrowed storage lifetime and inner type remain invariant. Tests reject overlapping output, off-by-one bounds, and a mutant that writes through both views.
3. **Initialization and ownership state.** `BorrowedSlot<T>` stores `MaybeUninit<T>` plus an explicit `SlotState`. `put` is allowed only when empty, `take` changes the state before moving the value, `drop_initialized` drops exactly once, and no `T` is read or dropped while uninitialized. The tests use a non-`Copy` drop counter and a panic-free invalid transition path; they do not execute an invalid unsafe operation. A compile-fail fixture proves that a borrowed value cannot outlive its source.
4. **Variance and auto-trait boundary.** `InvariantBorrow<'a, T>` uses a marker that preserves the required lifetime and `T` invariance and does not invent `Send`/`Sync`. The contract distinguishes shortening the outer reborrow from replacing a longer borrowed `T` with a shorter one, and checks that `Rc`/`Cell`-containing values do not cross a thread boundary through an unsafe manual implementation. Compile-fail controls assert the rejected lifetime substitution and rejected auto-trait claim; a positive test covers a genuinely thread-safe borrowed value.

The public prompts must state these names, fields, signatures, preconditions, and observable behavior without giving the implementation. Hidden tests may enforce the announced contract but may not introduce a second undiscoverable API.

## File map

Create:

- `src/content/unsafe-borrowed-memory.ts`: Polish sources, concepts, competencies, module, four lessons, eight primary gates, four blanks, four local recalls, and four independent review exercises.
- `src/content/unsafe-borrowed-memory-contracts.ts`: authored Rust reference snippets, test harnesses, expected compile-fail diagnostics, and distinct equivalent implementations. Keep Rust contracts separate from lesson prose.
- `src/content/unsafe-borrowed-memory-assessment-fixtures.ts`: canonical, equivalent, and compiling-mutant fixtures for every tested gate, recall, and review. Include fixture identity, expected status, and whether stable or Miri evidence is required.
- `src/content/unsafe-borrowed-memory-assessment.test.ts`: compile/run the canonical and equivalent fixtures and require each named semantic mutant to fail its independent assertions; test compile-fail controls by diagnostic class and source identity.
- `src/content/unsafe-borrowed-memory-integration.test.ts`: verify IDs, prerequisite graph, eight gates, four blank tasks, four reviews, material contract differences, evidence independence, and schema compatibility.
- `scripts/verify-borrowed-memory.ts`: restricted stable/MSRV/Miri verifier, manifest/hash checks, phase report, and no-learner-source argument allowlist.
- `src/content/unsafe-borrowed-memory-verification.test.ts`: verifier argument rejection, stale/hash/toolchain checks, phase classification, compile-error versus mutant rejection, Miri fixture identity, and report consistency.
- `tests/e2e/unsafe-borrowed-memory.spec.ts`: production browser flow covering prediction, authored result, reveal, assisted non-independent evidence, independent blank, non-empty draft/note, keyboard focus, console errors, download if used, and exact resume.

Modify:

- `src/content/course.ts`: register the new module after `unsafe-miri-contracts` and expose its sources, lessons, concepts, and review exercises without changing prior IDs.
- `scripts/verify-offline.mjs`: add one previously unvisited soundness lesson path with draft, hint/reveal boundary, independent blank, note, keyboard, and exact resume assertions. Use semantic step locators and persisted event checks.
- `package.json`: add `content:borrowed-memory` with an allowlist for `--fetch`, `--msrv`, and `--miri` only.
- `.github/workflows/ci.yml`: add stable/MSRV authored fixture verification and a pinned-nightly Miri step/job with separate artifacts and explicit timeout limits.
- `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, and `docs/ci-cd.md`: update English counts, scope, exact verification evidence, limitations, and release Hold after the implementation head is known.

Do not modify `src/domain/types.ts`, the persistence schema, or the browser compiler API. Do not add a downloadable project unless a later approved specification requires a package boundary; this milestone is intentionally limited to authored assessment fixtures and verifier evidence.

## Acceptance gates

The implementation is acceptable only when all gates below are true and recorded against the exact implementation SHA:

- Content validation reports the exact lesson, concept, trace, and blank counts; all new IDs are unique and the existing graph remains valid.
- Every primary, blank, recall, and review contract compiles from its published prompt and passes the canonical/equivalent tests. Every listed compiling mutant is executed and rejected for its named semantic difference.
- The provenance fixture rejects null-for-positive length, wrapped range, omitted initialization checks, overlapping mutable views, state-skipping `Drop`, lifetime substitution, and invented `Send`/`Sync` claims.
- Stable and exact Rust 1.85.0 runs perform `rustfmt --check`, `cargo fmt --check` where a Cargo fixture exists, `rustc`/Cargo tests, and Clippy with the same authored bytes. Stable/MSRV results are separate from nightly Miri results.
- Miri runs only the checked-in negative fixtures, verifies expected diagnostic identity, and records toolchain, source hash, fixture hash, phase status, and limitations. A missing Miri component or timeout is infrastructure, not pass.
- The verifier rejects arbitrary arguments, stale source/fixture hashes, mixed run identities, wrong toolchains, missing phase errors, compile errors misreported as mutant discovery, and reports that claim `passed` before every required phase completes.
- The E2E test proves reveal/help cannot create independent mastery, then proves a fresh independent blank can record a non-empty draft and note and resume exactly after reload. Keyboard and console-error assertions remain active.
- Offline verification covers the same soundness lesson path and preserves archive/cache behavior; if Chromium is unavailable locally, the limitation is reported and CI evidence is required.
- `npm test`, focused assessment/integration/verifier tests, typecheck, lint, content check/audit, build, E2E/offline, Rust checks, CI YAML parsing, and `git diff --check` are run. Any EPERM, timeout, missing toolchain, Miri, or cargo network limitation is recorded without weakening evaluators.
- Documentation names the exact head SHA and observed results. It does not claim complete unsafe soundness, absence of UB, universal Miri coverage, or release readiness.

## Task 1: Author the public soundness contracts

**Files:**

- Create: `src/content/unsafe-borrowed-memory-contracts.ts`
- Create: `src/content/unsafe-borrowed-memory.ts`
- Test: `src/content/unsafe-borrowed-memory-integration.test.ts`

**Interfaces:**

- Produces `unsafeBorrowedMemorySources`, `unsafeBorrowedMemoryConcepts`, `unsafeBorrowedMemoryCompetencies`, `unsafeBorrowedMemoryLessons`, `unsafeBorrowedMemoryReviewExercises`, and `unsafeBorrowedMemoryModule`.
- Produces fixture exports with exact signatures for `BorrowedRegion`, `split_borrowed`, `BorrowedSlot`, and `InvariantBorrow`.
- Consumes existing `Lesson`, `Concept`, `CourseModule`, `Source`, and evidence types; does not change those types.

- [ ] Write integration tests first for the four lesson IDs, prerequisite chain, eight `evidenceGate` steps, four blanks with no starter code, four code-evaluated reviews, and unique task references.
- [ ] Add the four Polish lesson prompts with the signatures and safety conditions in the Scope section. State the positive and negative boundaries explicitly; do not prescribe the body.
- [ ] Add prediction, authored observation, explanation, two tested gates, one blank, one local recall, misconceptions, hints, and project/transfer context for each lesson.
- [ ] Add a different review contract for each lesson. Reviews must change the type shape or call policy; they cannot be the primary function with renamed variables.
- [ ] Register the module after `unsafe-miri-contracts`, preserve existing module IDs and prerequisites, and verify the current counts from the catalog.
- [ ] Run the integration test and content validation before continuing.

## Task 2: Build executable assessment fixtures and mutants

**Files:**

- Create: `src/content/unsafe-borrowed-memory-assessment-fixtures.ts`
- Create: `src/content/unsafe-borrowed-memory-assessment.test.ts`
- Modify: `src/content/unsafe-borrowed-memory-contracts.ts`

**Interfaces:**

- Each fixture exports `{ id, canonical, equivalent, mutant, tests, mode, expectedDiagnostic? }`.
- `mode` is one of `stable`, `compile-fail`, or `miri-negative`; a fixture cannot silently change mode.
- Hidden tests compare full returned slices/state transitions and exact error classes, not source strings or `assert!(true)`.

- [ ] Write one failing test per semantic mutant: positive null handling, range overflow, omitted initialization, overlap, out-of-bounds split, state-skipping drop, lifetime variance, and auto-trait leakage.
- [ ] Add at least one non-`Copy` drop counter and one local non-`'static` borrowed value to prevent ownership shortcuts.
- [ ] Add equivalent implementations that differ structurally while preserving the public contract.
- [ ] Add compile-fail fixtures for lifetime escape and invalid `Send`/`Sync`; assert the expected diagnostic family and reject unrelated compiler errors.
- [ ] Add isolated Miri-negative fixtures whose paths, hashes, expected diagnostic, and toolchain are checked before execution. Do not run them as part of normal learner tests.
- [ ] Run the fixture test and confirm each mutant compiles where intended and fails for the intended behavioral assertion.

## Task 3: Implement the restricted verifier and report contract

**Files:**

- Create: `scripts/verify-borrowed-memory.ts`
- Create: `src/content/unsafe-borrowed-memory-verification.test.ts`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**

- CLI accepts no arguments or exactly `--fetch`, `--msrv`, and `--miri`; reject all combinations outside the documented matrix.
- Report fields include `schemaVersion`, `runId`, `sourceHashes`, `fixtureHashes`, `toolchain`, `host`, `phaseStatuses`, `phaseErrors`, `compileFailChecks`, `miriChecks`, `artifactPaths`, `artifactHashes`, and `limitations`.
- A phase status is `passed`, `failed`, or `infrastructure`; `passed` is legal only after all required phases complete and provenance matches the current authored bytes.

- [ ] Write negative validator tests for arbitrary paths/toolchains, stale source hashes, mixed run IDs, wrong stable/nightly toolchains, missing Miri diagnostics, compile-error-as-mutant, and premature `passed` reports.
- [ ] Implement fresh temporary extraction from the authored fixture registry, hash every source before compilation, and reject any served/generated mismatch.
- [ ] Run stable and exact 1.85.0 formatting, compilation, tests, and Clippy with bounded subprocess timeouts and a total budget. Keep stable/MSRV and Miri report identities separate.
- [ ] Run only named Miri-negative binaries with `rustup run nightly-2026-08-08 miri`, capture stdout/stderr and diagnostic identity, and classify missing components/timeouts as infrastructure.
- [ ] Emit JSON even on failure, preserve phase errors, and exit nonzero for failed or infrastructure reports. Never convert an incomplete run into `passed`.
- [ ] Add the `content:borrowed-memory` script and CI steps with exact toolchain setup, cache/fetch boundaries, and uploaded reports.
- [ ] Run verifier unit tests, argument checks, and a valid authored run where the local toolchain permits it.

## Task 4: Add browser and offline evidence coverage

**Files:**

- Create: `tests/e2e/unsafe-borrowed-memory.spec.ts`
- Modify: `scripts/verify-offline.mjs`

**Interfaces:**

- E2E reads persisted `events` and `mastery` from the existing IndexedDB state; it must identify a fresh assisted event by lesson/step and assert `hints > 0`, `revealed: true`, and independent evidence false.
- Offline flow uses exact semantic step locators, not generic `first()`/`count()` selectors, and checks the same persisted boundaries.

- [ ] Add a production flow for prediction, mocked authored success, two hints, reveal, and solution/download exposure.
- [ ] Execute a fresh assisted primary after reveal and assert its persisted event is not independent and does not increase independent mastery.
- [ ] Navigate to the independent blank, submit a non-empty draft through the mocked local contract, write a note, exercise keyboard focus, reload, and assert exact step/draft/note resume.
- [ ] Add console/page-error collection and fail on unexpected errors. Keep archive bytes and download checks where the existing flow provides them.
- [ ] Add the same lesson to the offline verifier after a previously unvisited navigation path; assert cached UI, draft, note, hints/reveal state, and exact resume. Do not run learner Rust.
- [ ] Run Playwright listing and the targeted E2E/offline commands. If macOS Chromium cannot launch, record the exact EPERM/bootstrap error and leave CI as the runtime gate.

## Task 5: Integrate docs, counts, and verification records

**Files:**

- Modify: `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, `docs/ci-cd.md`

**Interfaces:**

- Documentation names the module IDs, lesson/blank/review counts, verifier command, stable/MSRV/nightly distinction, and release Hold.
- Verification records use the exact implementation SHA, run IDs, observed phase statuses, toolchains, source/fixture hashes, and environment limitations.

- [ ] Update English README and CI/CD descriptions after the implementation head is fixed; do not put learner Polish copy in README.
- [ ] Update Polish curriculum/audit prose only where learner-facing or existing repository convention requires it, preserving the broader open-scope statements.
- [ ] Record exact passing commands and exact failures/limitations; do not claim Miri or complete soundness when infrastructure prevented it.
- [ ] Run a documentation count check, `npm run content:check`, `npm run content:audit`, and `git diff --check`.

## Task 6: Full acceptance review

**Files:**

- Test: all files listed above and existing package/content tests.
- Modify: no source files unless a failed acceptance test identifies a concrete defect.

- [ ] Run focused fixture/integration/verifier tests.
- [ ] Run `npm test`, typecheck, lint, build, content checks/audit, CI YAML parse, Playwright listing, and offline verification.
- [ ] Run stable and exact 1.85.0 authored Rust checks plus pinned nightly Miri where available; stop bounded runs rather than leaving a process indefinitely.
- [ ] Review the diff for learner-code execution, arbitrary-path/toolchain acceptance, weakened mutants, accidental ID/schema changes, stale counts, and unsupported soundness claims.
- [ ] Commit implementation in English only after exact-head documentation is updated. Keep release Hold and report all remaining concerns.

## Risks and explicit limits

- Miri detects behavior in the named interpreter fixtures; it does not prove all Rust unsafe programs or all hardware/compiler behaviors. Reports must state fixture identity and toolchain.
- Pointer provenance and aliasing rules are subtle and evolving. The lesson must distinguish documented API preconditions, compiler diagnostics, and modeled evidence from a complete language-memory-model theorem.
- Compile-fail diagnostics can change between stable and Rust 1.85.0. Match the announced diagnostic family and source identity, not a brittle complete stderr transcript.
- Miri, rustc, or Cargo setup may be unavailable or slow on a local host. Bounded infrastructure failures remain visible and cannot become green evidence.
- The current browser runner cannot safely execute arbitrary unsafe learner programs. This is a deliberate boundary; authored contract fixtures and independent browser evidence do not change it.
- Existing `unsafe-ffi-contracts` and `unsafe-miri-contracts` must remain distinct. Reusing their names, tests, or two-condition functions would create false assessment breadth.
- No implementation from this plan proves production readiness, absence of undefined behavior in arbitrary code, FFI trust, universal `Send`/`Sync` correctness, or release approval.
