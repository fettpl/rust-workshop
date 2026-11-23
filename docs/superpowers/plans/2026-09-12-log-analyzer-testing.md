# Log Analyzer and testing implementation plan

[Polski](2026-09-12-log-analyzer-testing.pl.md)

**Goal:** Teach executable testing contracts and deliver a streaming Log Analyzer with a downloadable Cargo workshop.

**Architecture:** Add two data-driven modules to the existing lesson, evidence and review engines. Keep browser exercises self-contained. Package a standard-library-only Rust 2024 library and CLI for terminal tests, doc tests, rustfmt and Clippy. Local checklist completion and downloads remain exposure, not independent mastery.

**Spec:** Original attachment, as amended by the user's audience instruction, and `docs/advanced-curriculum.md`. Learners know basic programming and begin Rust from zero. No previous-language comparisons.

## Contracts and ownership

- Testing: `src/content/testing.ts`; exports `testingLessons`, `testingModule`, `testingConcepts`, `testingCompetencies`, `testingSources`, `testingReviewExercises`. Module `testing-quality`, prerequisite `iterators`; first lesson prerequisite `iterator-contracts`. Three lessons: `testing-contracts`, `testing-regressions`, `testing-quality-workflow`.
- Log lessons: `src/content/log-analyzer.ts`; exports equivalent `logAnalyzer*` arrays/module and `logAnalyzerProject`. Module `log-analyzer`, prerequisite `testing-quality`; lessons `log-records`, `log-streaming`, `log-analyzer-project`. Two distinct tested alternatives per concept and coded reviews; blank final report challenge.
- Package: `src/content/projects/log-analyzer.ts`, exports `logAnalyzerPackage`, id `log-analyzer-workshop`. No external dependencies. Parser format `TIMESTAMP LEVEL MESSAGE`: decimal u64 timestamp, INFO/WARN/ERROR, nonempty UTF-8 message; preserve message remainder. Deterministic summary includes matched level counts and malformed-line count. CLI accepts file and optional exact level; errors to stderr/nonzero, no partial success output on IO errors.
- Streaming package: fixed-size BufRead chunks; bound retained line bytes to 4096, drain overlong lines, count one rejected record. Reject invalid UTF-8 per line; CRLF supported; final line without newline supported. Do not retain records, unbounded message keys, or all diagnostics. Tests include tiny chunks, a huge line followed by a valid one, IO failure, empty file, duplicates and final unterminated line.
- Module/package coupling: only three primary Log Analyzer gates (`records-debug`, `stream-debug`, `report-blank`) are marked helped by solution exposure; fresh alternatives remain available. Authors must keep matching IDs.

## Tasks

- [x] Author three testing lessons: assertions and table tests, boundary/regression cases, unit/integration/doc tests and quality workflow. Execute learner assertion helpers against correct and faulty implementations via hidden tests; a no-op must fail. Clearly distinguish tests, formatting and lints. Local Cargo commands are self-checks.
- [x] Author three Log Analyzer lessons: borrowed parse result and explicit errors, incremental summary with IO propagation, deterministic report from scratch; use new-domain alternatives and reviews. Exercise tests cover Unicode, filter vs validity, duplicates, final line and read error where relevant.
- [x] Build Cargo starter/reference fixtures with README, unit/integration/doc and process tests, small mixed log fixture, bounded streaming implementation and cost notes. Starter compiles but behavior tests fail as unfinished.
- [x] Integrate arrays/project/package in `src/content/course.ts`; add module-gate integration and project solution isolation regression tests. Update offline coverage for both packages and service worker version only if required.
- [x] Review all submitted fixtures and pedagogical claims. Verify starter rejection, solution acceptance, actual mutation sensitivity, source URLs, package formatting/test/Clippy; correct weaknesses before expanding content.
- [x] Run lint, typecheck, Vitest, authored Rust, Cargo packages, production build and relevant/full browser regressions. Verify exact resume and third-project selection/download/reveal with isolated browser state; inspect desktop/mobile, keyboard and console.
- [x] Update README, requirements audit, advanced map and verification report with actual counts/results and remaining gaps. Commit verified milestone without pushing.

## Acceptance boundaries

This milestone covers basic testing and streaming application design. Property/fuzz frameworks, measured performance benchmarks/profiles, workspaces, smart pointers, concurrency, async, unsafe/FFI and senior operations remain subsequent curriculum. This plan must not mark the whole advanced Log Analyzer contract or the full course complete merely because starter/reference packages exist.

## Verification note

Local verification, browser regressions, package red/green exercises and offline checks passed. External Playground smoke is prepared but was rejected by automatic approval review; specific user consent is pending. This limits remote-service verification, not local fixture or application results. See `docs/verification.md`.
