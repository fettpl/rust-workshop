# Initialized Prefix Practice Implementation Plan

[Polski](2026-10-15-initialized-prefix-practice.pl.md)

This plan adds one independently assessed initialization-to-borrow family to
the existing `unsafe-miri-byte-view` lesson. It preserves every earlier step,
alias, source relationship, review record, prerequisite, and learner-history
projection. The accepted pre-A3a source is the `main` commit
`3b95d5812891eafd9b867382c53787055cc87208`; the initialized-prefix work is a
development branch tracked in [PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

The plan is portable: paths below are relative to the repository root. A
read-only feasibility design and private observations may inform the work, but
they are not runtime inputs or product proof. Polish learner copy remains
Polish; this plan and repository documentation remain English.

## Frozen contract

```rust
use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong>;
```

The function returns `Err(TooLong)` before any write when `src` is longer than
`dst`. Otherwise it copies every source byte, in order, into exactly the
destination prefix and returns a borrow of that prefix. It preserves the
suffix and never reads it, including a suffix that is still uninitialized.
Empty, exact-capacity, partial-capacity, and arbitrary non-UTF-8 inputs are
valid. A non-empty result must point into the destination; empty-slice pointer
identity is unspecified. The source may expire before the result is used, but
the destination may not. `u8` has no `Drop` obligation.

The contract permits two maintained sound mechanisms: individual element
writes and checked bulk copying. It imposes no loop, token, or allocation ban;
a temporary allocation is allowed, but returning unrelated storage is not. The
learner starter is safe and returns `Err(TooLong)` unconditionally. No
undefined-behavior snippet appears in a learner starter, model, solution, or
generic extraction.

## Authored inventory and lesson shape

The accepted baseline contains 48 modules, 192 lessons, 194 concepts, 195
competencies, 1,273 steps, 349 sources, 194 ordinary reviews, and 199
registered reviews. This feature changes authored availability to 1,275 steps.
Within `unsafe-miri-byte-view`, the lesson grows from seven to nine steps; the
module remains at eight criteria, its task references grow from 16 to 17, and
its evidence gates grow from 12 to 13. The advanced provisional-family count
moves from four to three after integration. These are authored-content counts,
not learner outcomes.

Append exactly two steps after the existing seven:

1. `byte-view-initialized-prefix-model`, titled `Od storage do
   zainicjalizowanego prefiksu`. It is a runnable two-byte exposure model that
   writes `0` and `255` with `MaybeUninit::write`, publishes the initialized
   length, and prints `[0, 255]`. It has no coding task or evidence gate.
2. `byte-view-initialized-prefix`, titled `Zainicjalizuj prefiks i pożycz
   wynik`. It is the primary transfer task with family
   `unsafe-miri/initialized-prefix-v1`, evidence version 2, and an evidence
   gate. Add only this primary reference to `unsafe-miri-byte-view-gate`.

The model teaches initialized-length reasoning, exact `from_raw_parts` safety,
empty non-null/alignment rules, destination lifetime, and the absence of a
`Drop` obligation for `u8`; it is not the full solution. Do not add a `Slot`
prerequisite. Existing aliases remain `unsafe-miri/byte-view-v1`, and exposure,
choice, recall, review, and assisted work never become a new primary family.

## Evidence invariants

The browser-safe lesson exports the complete 42-case harness and both sound
mechanisms. It also exposes fourteen reviewed SAFE semantic variants, each with
its intended named assertion and a concrete restored implementation. For each
mechanism, include three distinct lifetime/borrow boundary pairs, corrected
ordinary assertions, and source-lifetime positives. Run the full 42 cases for
both mechanisms on current stable and exact Rust 1.85; apply the pinned nightly
Miri toolchain where the maintained Miri proof requires it.

The compiler matrix must retain actual diagnostic codes, primary-expression
locations, multiplicities, containment, and collateral diagnostics. Wrong
codes, spans, missing or extra diagnostics, and partial test suites fail. The
Miri-only skipped-write fixture is private to the maintained verifier and the
pinned nightly toolchain. Its sound twin must pass; a semantic result requires
the earliest authored forced read and its category. Setup, unsupported,
timeout, spawn, signal, or generic non-zero outcomes are failures.

Capture retains raw stdout, stderr, status, command, source-before/source-after
bytes, executable/config/toolchain metadata, archives, hashes, and guard
receipts before later classification or archive failures. A source-binding
rejection is orthogonal to derived diagnostics: source-dependent diagnostics,
ordinary panic interpretation, Miri classification, and library-test results
must not run on an untrusted source. The strict loader fails closed on absent,
partial, stale, or guessed observations, and accepts only the reviewed,
mode-specific bundle.

The 16 October record attributes 358 recipe records, 381 commands, and a
358/358 read-only interpreter audit to the historical capture. Its raw receipts
are no longer retained for fresh verification; these figures are historical
attribution only, not current retained-data or strict-proof acceptance.

At the 22 October recovery checkpoint, local validation passed the baseline
1,380-test unit suite without skips, all 2,519 authored Rust cases, content
validation (192 lessons, 194 concepts, 7 traces), and the production build.
The complete production browser suite passed 184/184 without skips, flaky
results, or retries. Offline checks preserved the initialized-prefix model,
primary task, draft, notes, help, and exact resume, while withholding compiler
credit when execution was unavailable. Follow-up qualification regressions
exercise stable version metadata and reject beta/nightly/dev release tokens.
Browser checks with intercepted runner responses establish UI/state behavior;
the separate trusted Rust fixture checks are compiler-backed.

The retained Native07 campaign passed stable and exact MSRV with 118 recipes,
125 commands, and 9 controls per mode. Its Miri attempt reached 122 recipes and
131 commands, exceeded the historical 480-second deadline, and retained ten
expected verdicts plus a category-mutator error. That attempt remains failed.
The category matcher is corrected. A subsequent Linux qualification failure
exposed a version check that scanned auxiliary Cargo metadata for prerelease
words; the check now validates the first release line while preserving exact
full-stdout and executable-hash qualification.

Full native acceptance requires the dedicated CI checks. Release acceptance
requires all eleven checks on the exact PR head and all eleven on the resulting
`main` commit; results are tracked in [PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

The original brief imposed no 480-second operational requirement, and no
learner-facing limits change here. The current `miri-safety` job has a
60-minute timeout with an operational plan of stable 8 minutes, MSRV 8 minutes,
and Miri’s 30-minute total deadline for the full capture and control campaign,
including qualification, commands, controls, and failure retention, totaling
46 minutes and leaving 14 minutes for setup headroom. The measured setup
interval in the Linux trial was 2 minutes 03 seconds, from 02:09:09 to
02:11:12 UTC, and is part of that headroom. The internal cooperative deadline
checks, all
eleven controls, and fail-closed acceptance rules remain unchanged. Earlier
480-second Native07 and Linux CI failures remain failed historical results.

The narrow pre-prefix fixture is copied byte-for-byte from the accepted source
snapshot. Its historical projection removes exactly the two appended steps and
the one primary criterion reference. Synthetic V1/V2/V3 builders preserve
ordered histories beyond 24 contacts, drafts, notes, help/reveal state, review
sessions, ratings, export/import, and reload; they are labeled synthetic and
never presented as learner observations.

## Implementation phases

### 1. Source and learner integration

- Add the browser-safe initialized-prefix exports, the complete 42-case
  harness, both sound mechanisms, the fourteen SAFE variants, the reviewed
  SAFE mutant, the safe starter, and the two ordered lesson steps.
- Preserve old lesson objects, source IDs, dates, metadata, prerequisite edges,
  aliases, and criterion semantics. Route the exact primary fixture before any
  broad ByteView match; unknown fixture IDs fail explicitly.
- Add the narrow pre-prefix fixture and compose its projection at historical
  callers without changing accepted old fixtures or compatibility helpers.
- Keep the native verifier, recorder, proof package, and browser-safe content
  separated. Browser modules must not import Node/native code; native helpers
  must not accept learner paths, arbitrary executables, arbitrary toolchains,
  or Vitest imports.
- Add the authored browser/offline scenarios for the model and primary lesson,
  exact drafts/notes/help/resume behavior, durable IndexedDB state,
  export/import, 390px layout, and Tab/Shift+Tab editor behavior. Offline
  runner unavailability must remain explicit and cannot award Rust correctness
  or independent coding credit.
- Update README, the advanced map, this plan, and the evidence boundary with
  the same contract and honest verification boundary.

### 2. Observation integration and proof review

- Review the current source, trusted mode-specific loader, recorder, native
  entry, proof classifiers, and source-binding ordering as one exact source
  cut. The loader starts undefined and consumes only reviewed observations.
- Retain a fresh read-only interpreter audit of the complete native capture;
  historical audit counts cannot replace current receipts. The three reviewed
  synthetic filesystem callbacks have passed on valid original and copied
  baselines, preserving original/external bytes and the intended finite outcomes.
- Run the nine stable and eleven Miri control cases against actual cloned
  native bytes. Valid baselines must pass; each mutation must reject for its
  intended finite reason. Raw packets and returned control decisions must agree. Preserve all setup, guard, timeout,
  archive, and transport failures.
- Use the completed source/proof review and qualified metadata to prepare the
  authorized strict campaign. Resolve any failed environment closure before
  claiming acceptance. Private feasibility positions, synthetic results, and
  prior captures cannot become current native observations.

### 3. Fresh product and release verification

- Run the complete stable, exact Rust 1.85, and pinned nightly Miri campaign:
  full 42-case positives for both mechanisms; fourteen SAFE variants with
  compile, intended isolated failure, restored full, and restored isolated
  outcomes; three boundary pairs per mechanism; source-lifetime positives; the
  Miri UB/sound-twin pair; classifier controls; and verifier tamper controls.
- Run the maintained lint, format, TypeScript, content/source guards, full
  unit suite, Rust/native checks, production build, production browser suite,
  and offline verification on the exact proposed source. Review desktop,
  mobile, keyboard, resume, history, and offline state behavior.
- After local checks and independent source/spec-quality review, prepare one
  English feature commit, push it, and open a pull request. Resolve current
  automated Codex/security review and require all eleven natural checks on the
  exact PR head before the already-authorized ordinary merge. Require all eleven
  checks on the resulting `main` commit before the next course feature. Refresh
  only the owned preview.

## Definition of Done

The feature is releasable only when all of the following are true:

1. The source has no TypeScript errors, pure tests pass, and all three reviewed
   filesystem callbacks pass with valid original and copied baselines. Nine
   stable and eleven Miri control inventories accept valid baselines and reject
   actual cloned-byte mutations for the intended finite reasons without original
   or external changes.
2. Normalized 118/118/122 recipe inventories and 48/48/64 source inventories
   match captured data exactly. All 20 compiler errors, 22 primary spans, 84
   intended panics, and the earliest Miri forced-read event are preserved.
   Root bundle/provenance acceptance remains documented separately from
   implementation.
3. The current product interpreter accepts the complete fresh real recipe
   inventory in read-only analysis, including ordinary full-suite failure
   bodies, while meaningful corrupted-output, source, code, and category
   controls remain rejected. The historical 358/358 attribution does not satisfy
   this requirement, and read-only acceptance is not a full strict proof.
4. A fresh strict run passes current stable, Rust 1.85, and pinned Miri with
   complete manifests, exact inventories, semantic checks, actual applicable
   controls, byte/transport/deadline/guard checks, and original immutability.
   The dedicated CI job uses its documented 60-minute operational timeout and
   8+8+30-minute mode plan; this timeout is execution headroom, not proof
   acceptance or a learner limit.
5. Required product integration checks pass on the exact source, including
   full unit, Rust/native, build, browser, offline, desktop/mobile/keyboard,
   resume, and history behavior. No human pilot or deployment is implied.
6. One English feature commit/PR passes whole-branch review, current automated
   review, and all natural PR checks; ordinary merge is followed by green
   resulting-main checks. No check here guarantees seniority, mastery,
   educational efficacy, professional readiness, hosting, or deployment.

Until these conditions hold, documentation must describe the source as an
authored A3a cut under review and keep historical attribution, fresh synthetic
results, and metadata qualification separate from pending strict native, UI, CI,
and release checks.
