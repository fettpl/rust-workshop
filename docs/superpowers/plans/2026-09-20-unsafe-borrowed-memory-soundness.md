# Unsafe Borrowed Memory Soundness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded, executable Rust curriculum milestone for reviewing the soundness of unsafe borrowed-memory abstractions, with independent compile/runtime/Miri evidence and explicit limits on what that evidence proves.

**Architecture:** Add one four-lesson module after `unsafe-miri-contracts`. Browser exercises remain authored, std-only Rust contracts evaluated by the existing isolated runner; they never execute learner or imported unsafe code. A restricted verifier compiles only checked-in fixture strings on stable and Rust 1.85.0, runs the named safe tests and compile-fail controls, and invokes the pinned nightly Miri toolchain only for isolated authored maintainer fixtures, requiring positive canonical/equivalent results and named negative diagnostics. Reuse the existing schema v3, lesson evidence engine, Miri reporting conventions, and release Hold.

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
- Do not execute UB intentionally in the browser, in the stable verifier, or in a learner package. Miri may interpret only isolated, checked-in maintainer fixtures: canonical/equivalent positive fixtures that must pass and named negative fixtures whose expected diagnostic and identity are pinned.
- No new production dependency, public API compatibility claim, FFI trust claim, universal memory-safety claim, performance claim, or professional-readiness claim.
- Preserve the release status `Hold`; this milestone does not replace advisory/license review, a human pilot, or a complete Rust memory-model proof.
- Model routing is fixed: GPT-6-Astra medium owns planning and qualitative review; GPT-5.6-Luna high owns implementation, tests, documentation, and Git operations. A separate soundness review gate must pass before the normal acceptance gate can be green.
- The final acceptance record must name the exact head SHA and show green exact-head CI for the content, stable/MSRV, Miri, E2E, and documentation checks; a branch-local result or a previous SHA is insufficient.
- Read the applicable `AGENTS.md` and the relevant Next guide before changing application code. This plan adds content and verification paths; it does not require a Next route or runner change.

## Scope and decisions

The milestone closes the explicit gap between practical raw-pointer/`MaybeUninit` exercises and reviewing an unsafe borrowed-memory abstraction as a whole. It does not repeat the existing `unsafe-ffi-contracts` C ABI/RAII work or the existing `unsafe-miri-contracts` `ByteView`, `Slot<T>`, and simple disjoint-slice contracts. The new contracts use different names, data shapes, and failure modes.

The module has exactly four ordered lessons, eight primary coding gates (two per lesson), four `evidenceGate` blanks, four independent code-evaluated reviews, and four lesson-local recall tasks. The twelve evidence-gate IDs are fixed as follows:

| lesson ID | primary gate IDs | blank ID | review ID | recall ID |
| --- | --- | --- | --- | --- |
| `unsafe-borrowed-provenance` | `unsafe-borrowed-provenance-boundary-gate`, `unsafe-borrowed-provenance-soundness-gate` | `unsafe-borrowed-provenance-blank` | `unsafe-borrowed-provenance-review` | `unsafe-borrowed-provenance-recall` |
| `unsafe-borrowed-reborrow` | `unsafe-borrowed-reborrow-boundary-gate`, `unsafe-borrowed-reborrow-soundness-gate` | `unsafe-borrowed-reborrow-blank` | `unsafe-borrowed-reborrow-review` | `unsafe-borrowed-reborrow-recall` |
| `unsafe-borrowed-slot` | `unsafe-borrowed-slot-boundary-gate`, `unsafe-borrowed-slot-soundness-gate` | `unsafe-borrowed-slot-blank` | `unsafe-borrowed-slot-review` | `unsafe-borrowed-slot-recall` |
| `unsafe-borrowed-auto-traits` | `unsafe-borrowed-auto-traits-boundary-gate`, `unsafe-borrowed-auto-traits-soundness-gate` | `unsafe-borrowed-auto-traits-blank` | `unsafe-borrowed-auto-traits-review` | `unsafe-borrowed-auto-traits-recall` |

The eight primary IDs and four blank IDs set `evidenceGate: true`; review and recall IDs set `evidenceGate: false` or omit it. `CourseModule.gateCriteria` has twelve separate required criteria, one per evidence-gate ID: boundary, soundness, and blank are separate criteria with exactly one ordinary `taskRefs` entry each. This is required because `moduleGate` treats multiple refs inside one criterion as alternatives; no `supplementaryStepRefs` is used for test-evaluated blanks. No generated or unrelated task is substituted. The independent maintainer gate is named `unsafe-borrowed-memory-soundness-review`; it is a review/CI gate rather than a learner task and is excluded from the twelve learner evidence gates. A revealed primary cannot satisfy its blank, recall, or review. Every task has a distinct authored fixture and at least one compiling semantic mutant that the hidden tests reject.

The four contracts are:

1. **Provenance and lifetime boundary.** The learner-safe browser contract is `BorrowedBytes<'owner>::from_slice(owner: &'owner [u8]) -> BorrowedBytes<'owner>` and `BorrowedBytes::reborrow<'short>(&'short self) -> BorrowedBytes<'short>`; the constructor ties the view to an actual owner and cannot manufacture a lifetime. The maintainer-only raw fixture separately exposes `unsafe fn from_raw_parts_unchecked<'a>(raw: *const u8, len: usize) -> Option<RawBorrowed<'a>>`. For every non-empty raw view, the caller must provide one live backing allocation, keep it initialized, aligned, non-aliasing, and valid for the entire `'a`, prove `len <= isize::MAX`, and prove that the byte range does not wrap; `len == 0` may use null only as an explicit empty representation with no dereferenceable range. These are caller obligations because the raw function cannot validate an arbitrary lifetime. The raw function never appears in learner starter code or browser execution. Tests use valid local allocations, an empty null view, multibyte byte lengths, and a compile-fail lifetime escape targeting only safe `from_slice`, never an arbitrary raw `'a`.
2. **Mutable reborrow, disjointness, and invariance.** The learner-safe contract is `split_borrowed<'a>(buffer: &'a mut [u8], mid: usize) -> Result<(&'a mut [u8], &'a mut [u8]), SplitError>` plus `InvariantBorrow<'owner, T>::from_mut(owner: &'owner mut T) -> InvariantBorrow<'owner, T>` and the exact `reborrow<'short>(&'short mut self) -> InvariantBorrow<'short, T>`. The outer loan may shorten; the inner `T` remains invariant through `PhantomData<fn(T) -> T>`, while `PhantomData<&'owner mut T>` carries the owner relationship and auto-trait bounds. A separate maintainer-only raw constructor is the only unsafe boundary. Tests reject overlap, `mid > len`, lifetime substitution, and a mutant that writes through both views.
3. **Initialization and ownership state.** The learner-safe browser contract is `SafeSlot<T>` backed by `Option<T>` with `put`, `take`, and `drop_initialized` state transitions; it contains no `MaybeUninit` and no raw pointer. The maintainer-only fixture mirrors the same state machine with `MaybeUninit<T>`, explicit `SlotState`, and a checked `unsafe` implementation. `put` is allowed only when empty, `take` changes state before moving the value, and drop occurs exactly once. Tests use a non-`Copy` drop counter, a local non-`'static` borrow, and no invalid unsafe execution outside Miri.
4. **Variance and Send/Sync boundary.** The learner-safe contract uses `InvariantBorrow<'owner, T>` only through `from_mut` and `reborrow`; no manual `unsafe impl Send` or `unsafe impl Sync` is teachable or accepted. The marker combines `PhantomData<&'owner mut T>` with the type-invariant function-pointer marker `PhantomData<fn(T) -> T>`. The mutable-borrow marker preserves the wrapper's auto-trait relationship to `T` while the function-pointer marker makes `T` invariant without preventing a valid shorter owner reborrow. Maintainer clients include `assert_send::<InvariantBorrow<'_, u8>>()` and `assert_sync::<InvariantBorrow<'_, u8>>()`. A `Cell<u8>` client is allowed to prove `Send` for the single-thread-owned mutable borrow but must fail `Sync`; both `Send` and `Sync` clients using `Rc<u8>` must fail. A positive `Send + Sync` client uses a mutable `u8`/`Arc`-free value. A mutant using an output-only `PhantomData` or an unsafe blanket impl is rejected. Compile-fail controls cover lifetime substitution, the `Cell<u8>` `Sync` bound, and both `Rc<u8>` bounds.

The public prompts state only the safe constructor, exact `reborrow` signature, fields/types, invariance behavior, and observable boundaries. Raw pointers, `MaybeUninit`, invalid states, and Miri fixture bodies live in maintainer-only fixtures and are never hidden requirements for learner code. Hidden tests may enforce only the announced safe contract.

### Learner versus maintainer execution boundary

| Surface | Allowed source | Contracts | Execution | Evidence |
| --- | --- | --- | --- | --- |
| Browser primary/blank/review | learner-safe authored snippets with references and slices | `from_slice`, `from_mut`, `reborrow`, `split_borrowed`, `SafeSlot`, trait-bound clients | existing isolated single-file Rust runner; no raw pointer or `MaybeUninit` | independent tests and persisted learner events |
| Stable/MSRV verifier | checked-in safe behavioral fixtures and compile-fail clients | boundary/state/output behavior and named diagnostics | stable plus exact 1.85.0 only | canonical/equivalent pass and safe mutants fail |
| Nightly Miri verifier | checked-in maintainer-only raw/`MaybeUninit` fixtures | explicit unsafe preconditions and named UB controls | pinned nightly-2026-08-08 Miri only | canonical and equivalent positive fixtures pass; negative UB fixtures produce expected diagnostics |

The fixture matrix is explicit: stable and MSRV execute only safe behavior and compile-fail controls; only Miri executes maintainer-only raw-pointer and `MaybeUninit` fixtures. Canonical and structurally equivalent positive Miri implementations must pass, while named negative Miri fixtures must produce their expected diagnostics.

| fixture family | stable/MSRV requirement | Miri requirement | rejected mutant examples |
| --- | --- | --- | --- |
| provenance/null/range | safe `from_slice` behavior, byte lengths, and boundary errors | canonical and equivalent raw-boundary fixtures pass | null-for-positive, wrapped range, invalid initialization |
| split/reborrow | safe disjoint slices, exact `mid` errors, and lifetime compile-fail controls | raw alias fixture produces the named diagnostic | overlap, out-of-bounds, aliased raw view |
| slot state | `SafeSlot` state and exactly-once drop behavior | `MaybeUninit` canonical/equivalent pass and negative state fixtures diagnose | omitted initialization, state-skipping drop, double drop |
| variance/auto-traits | safe invariance and `Send`/`Sync` positive/negative clients | declared canonical/equivalent marker clients pass; any raw boundary remains maintainer-only | lifetime substitution, output-only marker, unsafe blanket impl |

Real UB is never a stable/MSRV mutant case. A `miri-positive` fixture must compile and pass for both canonical and equivalent implementations. A `miri-negative` fixture must compile far enough to run and be rejected by the expected diagnostic; a compile error, timeout, or infrastructure error is not successful mutant discovery.

## File map

Create:

- `src/content/unsafe-borrowed-memory.ts`: Polish sources, concepts, competencies, module, four lessons, eight primary gates, four blanks, four local recalls, and four independent review exercises.
- `src/content/unsafe-borrowed-memory-contracts.ts`: authored Rust reference snippets, test harnesses, expected compile-fail diagnostics, and distinct equivalent implementations. Keep Rust contracts separate from lesson prose. The public interfaces use `BorrowedBytes`, `split_borrowed`, `SafeSlot`, and `InvariantBorrow`; maintainer-only raw/`MaybeUninit` interfaces are separate exports.
- `src/content/unsafe-borrowed-memory-assessment-fixtures.ts`: canonical, equivalent, and compiling-mutant fixtures for every tested gate, recall, and review. Include fixture identity, expected status, and whether stable or Miri evidence is required.
- `src/content/unsafe-borrowed-memory-assessment.test.ts`: compile/run the canonical and equivalent fixtures and require each named semantic mutant to fail its independent assertions; test compile-fail controls by diagnostic class and source identity.
- `src/content/unsafe-borrowed-memory-integration.test.ts`: verify IDs, prerequisite graph, twelve one-task criteria, four blank tasks, four reviews, material contract differences, evidence independence, and schema compatibility.
- `scripts/verify-borrowed-memory.ts`: restricted stable/MSRV/Miri verifier, manifest/hash checks, phase report, and no-learner-source argument allowlist.
- `src/content/unsafe-borrowed-memory-verification.test.ts`: verifier argument rejection, stale/hash/toolchain checks, phase classification, compile-error versus mutant rejection, Miri fixture identity, and report consistency.
- `tests/e2e/unsafe-borrowed-memory.spec.ts`: production browser flow covering prediction, authored result, reveal, assisted non-independent evidence, independent blank, non-empty draft/note, keyboard focus, console errors, download if used, and exact resume.

Modify:

- `src/content/course.ts`: register the new module after `unsafe-miri-contracts` and expose its sources, lessons, concepts, and review exercises without changing prior IDs.
- `scripts/verify-offline.mjs`: add one previously unvisited soundness lesson path with draft, hint/reveal boundary, independent blank, note, keyboard, and exact resume assertions. Use semantic step locators and persisted event checks.
- `package.json`: add `content:borrowed-memory` with an allowlist for no arguments, `--msrv`, and `--miri` only; reject `--fetch`, mixed modes, paths, and arbitrary toolchains.
- `.github/workflows/ci.yml`: add stable/MSRV authored fixture verification and a pinned-nightly Miri step/job with separate artifacts and explicit timeout limits.
- `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, and `docs/ci-cd.md`: update English counts, scope, exact verification evidence, limitations, and release Hold after the implementation head is known.

Do not modify `src/domain/types.ts`, the persistence schema, or the browser compiler API. Do not add a downloadable project unless a later approved specification requires a package boundary; this milestone is intentionally limited to authored assessment fixtures and verifier evidence.

## Acceptance gates

The implementation is acceptable only when all gates below are true and recorded against the exact implementation SHA:

- Content validation reports the exact lesson, concept, trace, and blank counts; all new IDs are unique and the existing graph remains valid.
- Every primary, blank, recall, and review contract compiles from its published prompt and passes the canonical/equivalent tests. Every listed compiling mutant is executed and rejected for its named semantic difference.
- The provenance fixture rejects null-for-positive length, wrapped range, omitted initialization checks, overlapping mutable views, state-skipping `Drop`, lifetime substitution, and invented `Send`/`Sync` claims.
- Stable and exact Rust 1.85.0 runs perform `rustfmt --check`, `cargo fmt --check` where a Cargo fixture exists, `rustc`/Cargo tests, and Clippy with the same authored bytes. Stable/MSRV results are separate from nightly Miri results.
- The independent soundness gate checks the lifetime-tied safe constructor, exact `reborrow`, invariance marker, raw boundary preconditions, learner/maintainer separation, and the complete `Send`/`Sync` client matrix before the normal content gate can pass.
- Exact-head CI is green for the same SHA across the stable, exact 1.85.0 MSRV, pinned Miri, browser/offline E2E, content, and documentation jobs; a prior successful SHA cannot satisfy this gate.
- Miri runs only the checked-in `miri-positive` and `miri-negative` fixtures. Canonical and equivalent positive fixtures must pass; negative fixtures must produce their expected diagnostic identity. The verifier records toolchain, source hash, fixture hash, phase status, and limitations. A missing Miri component or timeout is infrastructure, not pass.
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
- Produces fixture exports with exact signatures for `BorrowedBytes`, `split_borrowed`, `SafeSlot`, and `InvariantBorrow`, plus separate maintainer-only raw and `MaybeUninit` fixtures.
- Consumes existing `Lesson`, `Concept`, `CourseModule`, `Source`, and evidence types; does not change those types.

- [ ] Write integration tests first for the four lesson IDs, prerequisite chain, twelve `evidenceGate` steps (eight primary gates plus four blanks), twelve one-task `gateCriteria` entries that require boundary and soundness separately, four blanks with no starter code, four code-evaluated reviews, and unique task references.
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
- `mode` is one of `safe-behavior`, `compile-fail`, `miri-positive`, or `miri-negative`; `safe-behavior` and `compile-fail` run on stable and exact 1.85.0, while both Miri modes run only on pinned nightly. `miri-positive` requires canonical and equivalent success; `miri-negative` requires the named expected diagnostic. A fixture cannot silently change mode.
- Hidden tests compare full returned slices/state transitions and exact error classes, not source strings or `assert!(true)`.

The minimum executable matrix is:

| case | authored execution | expected result |
| --- | --- | --- |
| canonical safe behavior | stable and exact 1.85.0 | pass |
| equivalent safe behavior | stable and exact 1.85.0 | pass |
| safe semantic mutant | stable and exact 1.85.0 | named assertion fails |
| canonical/equivalent raw or `MaybeUninit` | nightly-2026-08-08 Miri (`miri-positive`) | pass |
| named UB mutant | nightly-2026-08-08 Miri (`miri-negative`) | expected diagnostic |
| compile-fail client | stable and exact 1.85.0 | expected diagnostic family |

The matrix forbids treating a stable compile error, timeout, or unrelated failing test as a successful semantic rejection; the named test must execute and fail for the named mutant.

- [ ] Write one failing test per semantic mutant: positive null handling, range overflow, omitted initialization, overlap, out-of-bounds split, state-skipping drop, lifetime variance, and auto-trait leakage.
- [ ] Add at least one non-`Copy` drop counter and one local non-`'static` borrowed value to prevent ownership shortcuts.
- [ ] Add equivalent implementations that differ structurally while preserving the public contract.
- [ ] Add compile-fail fixtures for a lifetime escape through safe `BorrowedBytes::from_slice` and invalid `Send`/`Sync`; assert the expected diagnostic family and reject unrelated compiler errors. Do not use an arbitrary raw `'a` in the lifetime compile-fail fixture.
- [ ] Add isolated `miri-positive` and `miri-negative` fixtures whose paths, hashes, expected diagnostic (for negatives), and toolchain are checked before execution. Do not run either mode as part of normal learner tests.
- [ ] Run the fixture test and confirm each mutant compiles where intended and fails for the intended behavioral assertion.

## Task 3: Implement the restricted verifier and report contract

**Files:**

- Create: `scripts/verify-borrowed-memory.ts`
- Create: `src/content/unsafe-borrowed-memory-verification.test.ts`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**

- CLI accepts no arguments, exactly `--msrv`, or exactly `--miri`; reject `--fetch`, combined modes, paths, and arbitrary toolchains. The no-argument invocation runs the host stable safe matrix; `--msrv` runs the exact Rust 1.85.0 safe matrix; `--miri` runs the pinned nightly Miri matrix.
- Report fields include `schemaVersion`, `runId`, `sourceHashes`, `fixtureHashes`, `toolchain`, `host`, `phaseStatuses`, `phaseErrors`, `compileFailChecks`, `miriChecks`, `artifactPaths`, `artifactHashes`, and `limitations`.
- A phase status is `passed`, `failed`, or `infrastructure`; `passed` is legal only after all required phases complete and provenance matches the current authored bytes.

- [ ] Write negative validator tests for arbitrary paths/toolchains, stale source hashes, mixed run IDs, wrong stable/nightly toolchains, missing Miri diagnostics, compile-error-as-mutant, and premature `passed` reports.
- [ ] Implement fresh temporary extraction from the authored fixture registry, hash every source before compilation, and reject any served/generated mismatch.
- [ ] Run stable and exact 1.85.0 formatting, compilation, tests, and Clippy with bounded subprocess timeouts and a total budget. Keep stable/MSRV and Miri report identities separate.
- [ ] Run only named `miri-positive` and `miri-negative` binaries with `rustup run nightly-2026-08-08 miri`; require canonical/equivalent positives to pass, capture stdout/stderr and diagnostic identity for negatives, and classify missing components/timeouts as infrastructure.
- [ ] Emit JSON even on failure, preserve phase errors, and exit nonzero for failed or infrastructure reports. Never convert an incomplete run into `passed`.
- [ ] Add the `content:borrowed-memory` script and CI steps with exact toolchain setup, cache/fetch boundaries, uploaded reports, and the CLI matrix below:

  | invocation | toolchain and phases | accepted |
  | --- | --- | --- |
  | `content:borrowed-memory` | host stable safe behavior, compile-fail, and report validation | yes |
  | `content:borrowed-memory --msrv` | exact Rust 1.85.0 safe behavior, compile-fail, and report validation | yes |
  | `content:borrowed-memory --miri` | nightly-2026-08-08 Miri canonical/equivalent and named negative fixtures | yes |
  | `content:borrowed-memory --fetch` | no authored verifier phase permits network fetch | no |
  | `content:borrowed-memory --msrv --miri` | mixed run identity and toolchain | no |
  | `content:borrowed-memory ./path` | arbitrary path input | no |
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
