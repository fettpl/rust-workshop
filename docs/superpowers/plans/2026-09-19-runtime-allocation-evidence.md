# Scoped Runtime Allocation Evidence for Log Analyzer

## Objective

Close the current measurement gap in Profile Evidence with an authored,
single-process allocation probe around the real Log Analyzer parser. Teach
learners to separate setup, measurement, and teardown, compare identical
workloads, distinguish allocator calls from memory/RSS claims, and reject
incomplete or incomparable evidence.

## Scope

- Extend `profile-evidence` with two Polish lessons, two concepts, four gates,
  two fresh reviews, and six assessed steps.
- Keep the existing Log Analyzer project; do not add a project.
- Add a portable-in-scope `GlobalAlloc` counter fixture for `alloc`,
  `alloc_zeroed`, `dealloc`, and `realloc`, with non-allocating counter logic.
- Compare baseline, candidate, and a behavior-preserving materialization mutant
  on identical inputs and identical `Summary` output.
- Add stable and exact Rust 1.85 verification, with Ubuntu/macOS coverage where
  available; no universal allocation or timing threshold.
- Close dedicated async lending gate/reveal/resume/offline/keyboard/console
  follow-up coverage and correct stale documentation counts.

Target catalog after integration: 171 lessons, 44 modules, 174 concepts,
126 blank-page tasks, 13 projects; recalculate source counts with validators.

## Lessons

1. **runtime-allocation-scope** — keep data preparation and warm-up outside the
   measurement window, measure the real parser call, and close the window on
   both `Ok` and `Err` paths.
2. **runtime-allocation-comparison** — compare baseline and candidate on the same
   input and result, separate allocator calls from requested bytes and retained
   memory, and reject incomplete or incomparable evidence.

Each lesson includes prediction, contrasting execution, interpretation, a
primary gate, a fresh transfer, and an independent review. Preserve schema v3,
existing IDs, reveal policy, and independent proof requirements.

## Authored archive changes

Add to the Log Analyzer package:

- `examples/allocation_probe.rs`
- `examples/support/allocation_counter.rs`
- `tests/allocation_counter_contract.rs`
- `ALLOCATION-MANIFEST.json`
- `ALLOCATION-EVIDENCE.md`

Integrate through the existing project generator. The probe is single-process,
single-threaded, and does not run libtest inside its measurement window. It
reports observed global allocator calls for a named window, not RSS, stack size,
or total system memory. Setup, warm-up, formatting, and teardown stay outside
the window. A failed `realloc` does not count as freeing the old block, and no
real OOM is triggered.

Measure `analyze_reader(Cursor<&[u8]>, filter)` using empty input, 512 valid
records, repeated workload, malformed/UTF-8/CRLF input, and line-boundary
cases. Baseline and candidate must return identical `Summary`. The mutant keeps
the result but materializes owned payloads during parsing; it must be observed
on supported builds. An inconclusive instrumented result is infrastructure
failure, never a successful performance claim.

## Content and verifier

Add:

- `src/content/runtime-allocation-evidence.ts`
- `src/content/runtime-allocation-assessment-fixtures.ts`
- `src/content/runtime-allocation-assessment.test.ts`
- `src/content/runtime-allocation-integration.test.ts`
- `scripts/verify-allocations.ts`
- `src/content/allocation-verification.test.ts`

Update `src/content/profile-evidence.ts`, `src/content/course.ts`, package
scripts, and CI. Add `content:allocations` accepting only `--fetch` and
`--msrv`. The restricted verifier must regenerate and compare both authored
archives, validate manifest/source hashes, run fmt/check/test/Clippy offline,
execute baseline/candidate/mutant in separate processes, and emit JSON with
toolchain, target, build profile, archive SHA, workload identity, and limits.

Required assessment mutants include measuring setup, reporting inside the window,
not closing on error, comparing different inputs, ignoring different results,
and treating incomplete reports as improvements. Gate/blank/review equivalents
must be materially different implementations.

## Previous milestone integration and docs

Add dedicated async search → gate → reveal → independent transfer, exact resume,
offline ZIP, keyboard, and console-error coverage in the existing E2E/offline
paths. Correct `advanced-curriculum.md:113` to five criteria containing ten
gate/blank tasks and five reviews. Update requirements audit headings and
"After async lending" wording, current counts, progress, verification, README,
and CI/CD docs without removing the broader release Hold.

## CI and acceptance

Add an `allocation-evidence` job with Ubuntu/macOS × stable/exact Rust 1.85
where runner cost permits; minimum Ubuntu stable/MSRV plus macOS stable. Keep
existing jobs, artifacts, fuzz/Miri/profile evidence, and no Valgrind dependency
for the new counter. Run standard typecheck, tests, content checks/audit, build,
production E2E, offline verification, authored Rust, stable/MSRV archives, and
`git diff --check`.

## Non-goals

No universal allocation count, time threshold, RSS claim, system profiler,
multithread attribution, production allocator, custom runner, learner-code
execution, or removal of historical limitations. `black_box` is a hint, not a
semantic guarantee. Broader property/fuzz curriculum, production operations,
advisory/license review, registry publication, and the human learner pilot stay
open.

Planning and qualitative review use GPT-6-Astra (medium). All implementation,
tests, documentation, and Git operations use GPT-5.6-Luna (high).
