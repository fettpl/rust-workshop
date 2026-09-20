# Fuzz Evidence Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach and verify a complete bounded Rust fuzz workflow: preserve an input domain, compare against an independent oracle, distinguish campaigns from replay, retain the failure class during reduction, and promote a counterexample to a stable regression with auditable evidence.

**Architecture:** Add one four-lesson module after Property Contracts and extend the existing Mini grep archive and restricted fuzz verifier. Browser exercises remain deterministic std-only Rust contracts; actual instrumentation and campaigns run only against the authored archive. Share the package's decoding/oracle adapter between its fuzz target and stable replay tests, while keeping the oracle independent of production selection logic.

**Tech Stack:** Existing TypeScript content model, Vitest, Playwright, Rust stable and exact 1.85.0 for ordinary tests; existing cargo-fuzz 0.13.2, libfuzzer-sys 0.4.13 and nightly-2026-08-08 for instrumented execution.

**Spec:** This document is the bounded milestone specification, derived from `docs/advanced-curriculum.md` (testing competencies, Mini grep and independent evidence), `docs/requirements-audit.md`, `docs/progress.md`, `docs/verification.md`, `README.md`, and `docs/superpowers/plans/2026-09-19-runtime-allocation-evidence.md`. It is a plan, not implementation or a verification report.

## Global constraints

- Preserve `schemaVersion: 3`, existing lesson/concept/project IDs, drafts, notes and mastery semantics.
- Learner-facing curriculum is Polish; README remains English.
- Exact Rust 1.85.0 remains the supported floor for stable package and browser fixtures. A nightly fuzz result is not an MSRV result.
- Execute only authored fixtures locally. Verifiers accept no learner/imported source, file paths, dependency overrides or arbitrary toolchains.
- Browser completion, archive download and observed maintainer campaigns do not award independent learner evidence.
- Preserve release Hold. This milestone cannot supply live advisory/license review, registry publication, production readiness or a human pilot.
- Planning uses GPT-6-Astra medium; implementation, tests, documentation changes and Git operations use GPT-5.6-Luna high, following the runtime-allocation plan's model allocation and the requested planning exception.
- Read applicable `AGENTS.md` and relevant installed `node_modules/next/dist/docs/` guidance before implementation code; no Next routing or runner changes are required here.

## Why this milestone

The current catalog is 171 lessons / 44 modules / 174 concepts / 126 blank tasks / 314 sources / 13 projects / 7 traces. Property Contracts already teaches invariant/oracle, bounded generators, shrinking/replay and metamorphic relations using Proptest. Mini grep already has a real instrumented libFuzzer target and controlled substring-to-prefix mutant. Repeating those basics or introducing another parser would add infrastructure without closing the learner workflow.

The missing bridge is an assessed learner path from raw bytes to trustworthy fuzz evidence. This milestone reuses a mature fixture, adds a stable regression contract, and makes the existing campaign's evidence machine-readable. It is independently reviewable in one PR and provides transferable skills relevant to every later parser and service project.

| Open area | Existing evidence | Decision in this PR |
| --- | --- | --- |
| Broader property/fuzz curriculum | Four Proptest lessons; bounded Mini grep campaign, fixed mutant and restored replay | Address the fuzz workflow and evidence bridge; leave stateful/structured protocol fuzzing, long-running campaigns and broader generators open |
| Unsafe abstraction variance / dyn compatibility | Safe variance/HRTB, GAT, async boxed adapter, bounded Miri/FFI | Defer: a separate API/soundness milestone needs focused compile-fail and Miri design |
| Production operations | Authored admission, telemetry, drain and capstone fixtures | Defer: deployment, authentication, operational telemetry and incident operations need a separately chosen environment |
| Live advisory/license / registry | Offline supply-chain fixture explicitly reports unsupported/infrastructure; publish=false | Defer: requires real current external evidence and publication decisions, not more simulated approval |
| Human learner pilot / accessibility | No pilot; manual screen-reader review open | Keep open: engineering cannot manufacture observed learner transfer or human review |
| Remaining advanced breadth | Full memory model/progress guarantees, broader API evolution, RSS/retained-memory, provenance and migration history | Keep explicit; this PR does not claim senior readiness |
| Existing verification/documentation debt | Loopback E2E/offline evidence pending in docs; stale capstone and runtime-counter prose | Re-run relevant checks in a capable environment and correct current-state contradictions, retaining historical reports |

Alternative considered: unsafe abstraction contracts would deepen a narrower topic, but needs a new soundness case while fuzz has reusable machinery with an immediate assessment gap. Live release assurance would reduce release blockers but depends on current external infrastructure and human license review; it is less bounded as the next teaching milestone.

## Scope and counts

Add module `fuzz-evidence-lifecycle`, prerequisite `property-contracts`, with exactly four lessons, four concepts, four competencies, four primary gates, four independent blank tasks and four independent code retrievals. Include prediction, contrasting run/observation, explanation rubric, modification/debugging and a fresh transfer in each lesson. Eight gate/blank tasks are the assessed exit alternatives; additional practice is not counted as another exit gate.

Target: **175 lessons, 45 modules, 178 concepts, 130 blank tasks, 13 projects, 7 traces**. Derive source count from `content:check`/`content:audit`; reuse existing source IDs for the same documents where appropriate rather than inventing a target count. Extend Mini grep project ownership and package reveal mapping; no fourteenth package.

Non-goals: new parser/service, new fuzz engine, distributed or scheduled campaigns, new telemetry UI, percentages of total input coverage, security certification, general crash reducer, fuzzing arbitrary learner code, changing the Playground boundary, blanket source cleanup, new production dependencies or promises of universal reproducibility from a seed.

## Lesson and evidence contracts

For every lesson, use step IDs `${lessonId}-gate` and `${lessonId}-blank`; use concept IDs equal to lesson IDs. Module criterion IDs are `${lessonId}-contract`. Gate/blank/retrieval must change implementation and data rather than renaming one answer.

| Lesson ID / Polish title | Main contract and primary gate | Independent transfer / retrieval | Required rejected mistakes |
| --- | --- | --- | --- |
| `fuzz-input-domain` / „Surowe bajty i granica harnessu” | Decode the documented Mini grep three-byte header safely; preserve raw body bytes, distinguish absent framing from a parsed case and assert invalid-domain behavior instead of silently dropping it | Blank uses a length-prefixed binary command; retrieval uses a tagged record with local bounds | UTF-8-lossy conversion of body; invalid cases silently skipped; unchecked slice for short header; query-byte length confused with character count |
| `fuzz-oracle-sensitivity` / „Oracle musi wykrywać błąd” | Compare full ordered `(line_number, text, matched)` outputs and error classification; show the existing prefix mutant differs from the independent distance/mask oracle | Blank compares a bounded frame decoder with an independently modeled result; retrieval compares duplicate-preserving search selections | Panic-only success; compare just lengths; sort/deduplicate before comparison; ignore error-versus-success |
| `fuzz-counterexample-regression` / „Od kontrprzykładu do regresji” | Select a smaller witness only when it still produces the exact intended contract failure; retain original bytes and replay against mutant and restored reference | Blank reduces a malformed record while preserving a named error; retrieval reduces a frame-length mismatch and rejects a smaller timeout | Smaller input changes failure class; empty/nonfailing witness accepted; restored reference still fails; artifact only, no executable regression |
| `fuzz-campaign-evidence` / „Co naprawdę potwierdza kampania” | Classify a typed evidence dossier as completed bounded campaign, reproduced finding or infrastructure failure; replay is a distinct operation and cannot satisfy campaign evidence | Blank diagnoses two campaign reports with different archive hashes; retrieval separates missing instrumentation, tool failure and a real oracle finding | Build success treated as campaign; replay counted as generated runs; timeout green; stale artifact accepted; missing identity accepted; finite successful run called proof of no bugs |

Browser code contracts model these decisions, not libFuzzer itself. Intro explicitly distinguishes property-based generators and shrinking from coverage-guided byte mutation, corpus replay and the reducer. Explain that compiler instrumentation counters are observations, not a percentage of all inputs. Keep primary/gate starter solutions out of independent blank and retrieval definitions. Previewing either archive marks only the appropriate primary tasks as assisted.

## Authored archive design

Keep `mini-grep-workshop` and the current `selection` target. Add package files through a small `src/content/projects/mini-grep/fuzz-evidence.ts` export and the existing archive generator:

- `fuzz/support/case.rs`: std-only decoder for the existing binary header; no libfuzzer dependency.
- `fuzz/support/check.rs`: shared adapter calling real `Query`, `select_context`, `scan_reader` and the independent `fuzz/oracle.rs`; produces a typed mismatch before the fuzz target asserts.
- `tests/fuzz_regressions.rs`: stable tests importing support files by relative `#[path]`, including a fixed substring-versus-prefix witness and boundary vectors.
- `FUZZ-MANIFEST.json`: schema version, target name, reviewed toolchain pins, input bounds, source-file hashes and fixed regression SHA-256; generated hashes refer to final archive content and do not hash the manifest recursively.
- `FUZZ-EVIDENCE.md`: learner workflow, domain exclusions, commands, triage rubric, replay-versus-campaign distinction and limitations.
- `fuzz/regressions/substring-prefix.seed`: checked-in UTF-8-safe binary-header fixture `[0,0,1] + "xax\n"` (query `x`, body `ax\n`). All bytes survive the package's string representation. Test compares exact encoded bytes.

Refactor the existing fuzz target to call the shared check adapter, preserving its current domain: 3..=4096-byte inputs; context byte modulo 20; declared query length clamped to available bytes; query converted with existing lossy policy; body remains raw bytes. Query, context, invalid UTF-8 and NUL failures continue to be checked. Do not change production `src/search.rs` behavior except temporarily within the controlled-mutant verifier workspace.

The package adapter returns `Result<(), FailureKind>` where `FailureKind` distinguishes `QueryAcceptance`, `ContextAcceptance`, `BodyAcceptance`, `SelectionMismatch`, and `ReaderMismatch`. The fuzzer retains the exact existing selection assertion message for its known mutant. Harness decoding failures outside the framing domain are counted/explained as exclusions, not successful parser tests.

Add an authored, deterministic deletion reducer in the maintainer verifier, not a promise of general libFuzzer minimization. Starting from a larger retained witness, attempt chunk deletions in fixed order; accept only strictly smaller candidates within the framing domain that reproduce `SelectionMismatch`. Cap attempts at 256 and total candidate subprocess time at 30 seconds. Preserve the original. The result need not be globally minimal: call it a reduced witness. A compile error, timeout or other assertion is never a valid reduction predicate.

This explicit reducer makes the lesson reproducible. Actual libFuzzer crash discovery remains a separate instrumented run. Do not claim that manual/authored seed failure proves discovery of an unknown bug.

## File map

| File | Responsibility |
| --- | --- |
| Create `src/content/fuzz-evidence-module.ts` | Module, prerequisites and four exit criteria |
| Create `src/content/fuzz-evidence.ts` | Four Polish lessons/concepts/competencies, sources and retrievals |
| Create `src/content/fuzz-evidence-assessment-fixtures.ts` | Gate/blank/retrieval references and controlled incorrect solutions |
| Create `src/content/fuzz-evidence-assessment.test.ts` | Compile/run correct references and reject semantic mutants |
| Create `src/content/fuzz-evidence-integration.test.ts` | Registration, prerequisites, reveal independence and target counts |
| Modify `src/content/course.ts` | Register all new exports in existing arrays |
| Create `src/content/projects/mini-grep/fuzz-evidence.ts` | New authored Cargo files and manifest construction |
| Modify `src/content/projects/mini-grep/fuzz.ts`, `archive.ts`, `package.test.ts` | Shared adapter, archive composition and byte/file contracts |
| Modify `src/content/projects/mini-grep.ts` | Project lesson/concept/reveal references and instructions |
| Create `scripts/fuzz-evidence.ts` | Typed report validation and bounded reduction orchestration, no module-load process execution |
| Modify `scripts/verify-mini-grep-fuzz.ts`, `scripts/fuzz-result.ts` | Authored-only execution, report production and stricter run identity |
| Create `src/content/fuzz-evidence-verification.test.ts`; modify `src/content/fuzz-result.test.ts` | Behavioral report/reducer tests, malformed/stale evidence rejection |
| Modify `.github/workflows/ci.yml` | Preserve existing job; upload fresh report and all failure evidence |
| Modify `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs` | New module gate/reveal/transfer/resume, package and offline assertions |
| Modify `src/content/runtime-allocation-integration.test.ts` | Update global count assertions to target catalog, preserve allocation checks |
| Modify `README.md`, `docs/{advanced-curriculum,requirements-audit,progress,verification,ci-cd}.md` | Honest scope, commands, counts and fresh verification evidence |

## Task 1: Implement the learner contracts and independent assessments

**Consumes:** existing `Lesson`, `Concept`, `Competency`, `CourseModule` contracts and the Property Contracts lesson pattern.
**Produces:** `fuzzEvidenceModule`, `fuzzEvidenceLessons`, `fuzzEvidenceConcepts`, `fuzzEvidenceCompetencies`, `fuzzEvidenceSources`, `fuzzEvidenceReviewExercises`; eight gate/blank alternatives and four retrieval fixtures.

- [ ] Add failing integration assertions for the exact four lesson IDs, prerequisites, four concept-linked retrievals and eight task references. Use the existing content-validation helpers rather than source-string assertions.
- [ ] Define reference Rust interfaces in the assessment fixtures, including `decode_case(&[u8]) -> Option<Case<'_>>`, exact output comparison, `choose_witness(original, candidates, observations)` and `classify_report(report)`. `Case` owns the lossy query and borrows the body; its lifetime is from the input. For lesson exercises use finite observations, never launch a subprocess.
- [ ] Write semantic tests with raw `[0xff]` body, 0/1/2-byte headers, encoded multibyte query, duplicate rows, nonmatching counts, changed error class, stale hash, absent instrumentation, timed-out run and replay-only report. Assert a correct solution passes before evaluating any mutant.
- [ ] Add each lesson's positive reference and all required mistakes in the lesson table; run `npx vitest run src/content/fuzz-evidence-assessment.test.ts` and establish RED/GREEN evidence. A mutant rejected by syntax error is not evidence of oracle sensitivity.
- [ ] Author and register the four Polish lessons, separate blanks/retrievals and source relationships. Follow existing delayed retrieval rules; do not add a new progress schema.
- [ ] Run `npm run typecheck`, the two new focused tests and `npm run content:check`; confirm target counts and no graph cycle.

A test oracle example for the first fixture (adapt into its declared harness):

```rust
let bytes = [0, 0, 1, b'x', 0xff];
let case = decode_case(&bytes).expect("framed input");
assert_eq!(case.query, "x");
assert_eq!(case.body, &[0xff]);
assert!(decode_case(&[0, 0]).is_none());
```

## Task 2: Extend the real Mini grep package with replay evidence

**Consumes:** existing archive generator, production Mini grep functions and independent oracle.
**Produces:** shared `Case` / `FailureKind` check adapter, fixed regression, stable replay tests and FUZZ manifest/documentation.

- [ ] Add failing archive tests checking presence of all seven new files, exact seed bytes, no runtime dependencies and both archive variants. Ensure package reveal references increase from four to eight primary gates; independent blanks/retrievals are absent.
- [ ] Extract the existing target's decoder/check logic into the shared support files, keeping the oracle unchanged and independent. The target adapts `SelectionMismatch` into its existing assertion identity; it must not swallow `Err` values.
- [ ] Add stable regression tests checking `(1, "ax", true)` for the fixed witness; preserve invalid raw UTF-8, NUL, CRLF, empty input, short framing, invalid query/context and duplicate-result cases.
- [ ] Verify the fixed substring-to-prefix mutant compiles and fails the named stable regression, while restoring the original passes. Keep mutation isolated in temporary verifier output, never edit checked-in production Rust strings during a test run.
- [ ] Regenerate starter/solution archives and verify existing starter failure semantics. Document local replay and campaign separately in package instructions.
- [ ] Run Mini grep package Vitest, `npm run content:cargo` on stable and the supported existing MSRV archive path. Exact Rust 1.85.0 must run the new stable replay tests; do not substitute nightly.

## Task 3: Produce strict campaign, reduction and replay reports

**Consumes:** Task 2 authored archive and fixed regression; existing `verifyFuzzResult` process classification.
**Produces:** `test-results/mini-grep-fuzz/run-*/report.json`, fresh logs, corpus, original and reduced artifacts; nonzero exit on failed or unsupported verification.

Maintain `content:fuzz` CLI accepting only optional `--fetch`. Do not add paths or arbitrary target/seed/toolchain flags. Compare both served ZIPs against the generator before execution, preserve lockfiles byte-for-byte, resolve cargo/rustc/rustdoc from the pinned toolchain and keep the existing subprocess limits.

Report schema must carry `schemaVersion: 1`, unique `runId`, `archiveSha256`, `manifestSha256`, target, tool versions/host, bounds, reference campaign status and observed executions, mutant identity, original/reduced artifact hashes and sizes, reduction attempt count/status, mutant replay and restored replay status, stable regression identity, phase errors and explicit limitations. Store raw logs independently; report fields are extracted/verified observations, never hardcoded success values. Include status `passed`, `failed`, or `infrastructure`; write partial reports in `finally` and never overwrite them as passed after an error.

- [ ] Add failing report/reducer tests with an injected subprocess function. Reject missing fields, unknown schema, replay masquerading as campaign, mixed run IDs, hash mismatch, wrong assertion, zero-length witness, compile failure, timeout and stale artifact path.
- [ ] Keep reference campaign limits: seed 20260913, maximum 20000 runs or 30 seconds, input <=4096 bytes, timeout 3 seconds and RSS limit 1024 MB; require at least the existing 1000 observed runs plus instrumentation and normal completion. Unsupported toolchain is infrastructure failure.
- [ ] Run existing fixed mutation and require actual fresh artifact plus expected instrumented assertion, then replay the original artifact against the still-mutated binary before reduction.
- [ ] Run the bounded reducer against the same mutant; record candidate predicate results. Require a deliberately padded authored witness to shrink strictly while retaining `SelectionMismatch`; no strict shrink is demanded for an already small newly discovered crash. Both original and accepted reduced artifacts must replay with that exact failure.
- [ ] Restore reference in `finally`, rebuild and replay original plus reduced artifacts successfully. Stable regression validates the checked-in witness separately on stable/MSRV; do not claim a generated crash is checked in automatically.
- [ ] Write report and preserve diagnostics/corpus/artifacts on success or failure. Test that executing a stale log or merely compiling the binary cannot satisfy any replay/campaign phase.
- [ ] Run `npx vitest run src/content/fuzz-result.test.ts src/content/fuzz-evidence-verification.test.ts` then `npm run content:fuzz -- --fetch` in the supported nightly/C++ environment.

Reducer unit acceptance example: with original bytes `ABCDE` and an injected predicate true only for `BC`, `ABC`, `BCD`, `ABCD`, `BCDE`, and `ABCDE`, output must be shorter, preserve byte order and satisfy the predicate. With a predicate that reports timeout for every shorter candidate, return unchanged bytes plus a non-success reduction result; never treat timeout as a reproduced finding.

## Task 4: Integrate CI and verify the actual learner path

**Consumes:** registered module, updated archives and strict verifier report.
**Produces:** reproducible CI artifacts plus browser/offline evidence at the tested PR SHA.

- [ ] Extend existing `mini-grep-fuzz` job, retaining pinned Actions, pinned nightly, existing install command and report directory. Upload `report.json`, logs, corpus and artifacts with `if: always()` and seven-day retention. Do not add network execution to Vitest.
- [ ] Ensure stable and workspace-msrv Cargo checks run new regression tests; keep existing property/fuzz/Miri/profile/allocation jobs. No `continue-on-error` for required evidence.
- [ ] Add one browser scenario searching the Polish module, opening the domain gate, recording a prediction and mocked successful runner result, revealing the archive, completing a distinct blank, saving draft/note and reloading to the exact step. Check the assisted primary cannot become independent mastery.
- [ ] Exercise Tab/Shift+Tab and the existing editor toggle; assert no unexpected console/page errors. Keep mocked execution labeled as UI/evidence-wiring verification.
- [ ] Extend offline verification with an unvisited fuzz lesson after initial cache, exact blank draft/note resume, and byte equality for both updated Mini grep ZIPs. Reuse the actual production build.
- [ ] Run focused browser tests then production E2E without retries and offline in an environment that permits loopback. If local loopback is denied, use the CI evidence rather than reporting authored tests as executed.

## Task 5: Refresh documentation and close the PR with measured evidence

- [ ] Update current count assertions and six documentation files from actual validator output. Preserve historical snapshots with dates; do not rewrite earlier runs as new results.
- [ ] Correct stale `docs/progress.md` language saying capstone remains to be built and runtime allocation counter remains wholly absent. Correct current portfolio/roadmap cells in `advanced-curriculum.md` that still list the implemented counter as planned. Preserve broader RSS, platform-independent threshold and capstone release-Hold limitations.
- [ ] Describe this milestone as a bounded fuzz lifecycle, not completion of full property/fuzz curriculum or proof of bug absence. State exactly which regression ran on stable/MSRV and which campaign ran on nightly.
- [ ] Record actual SHA, environment, commands, observed test counts, artifact/report locations, reducer outcomes and limitations in `docs/verification.md`. Never invent passing results from this plan.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run content:check`, `npm run content:rust`, `npm run content:property -- --fetch`, `npm run content:fuzz -- --fetch`, `npm run content:audit`, `npm run build`, production E2E/offline and relevant stable/MSRV package checks. Existing required CI must pass; rerun only affected failures after fixes.
- [ ] Run `git diff --check`, review the implementation against every acceptance condition below, then commit/open one PR according to the authorized execution workflow. This planning task itself changes only this document and does not commit.

## Acceptance criteria

1. Exact target catalog is validated; four new concepts each have primary, genuinely independent blank and retrieval evidence.
2. Every correct reference passes; each named assessment mistake is rejected semantically. Reveal/download cannot award independent evidence.
3. Both regenerated Mini grep ZIPs match served bytes; existing package identity, old progress and no-runtime-dependency boundary remain intact.
4. Shared harness preserves the documented raw-body domain; independent oracle checks full ordered results and error classes.
5. Fixed regression passes on stable and exact Rust 1.85.0; the controlled mutant compiles and is rejected by the regression.
6. Pinned instrumented campaign completes within stated limits; mutant produces/replays the intended fresh finding; bounded reducer preserves failure class and reduces the padded witness; restored reference replays both witnesses successfully.
7. Report validator rejects malformed, stale, incomplete and infrastructure evidence; fresh report with provenance and raw diagnostics is uploaded by CI.
8. Production UI and offline flow passes on a loopback-capable runner with no unexpected console errors, preserving drafts/notes and independent mastery rules.
9. Required CI is green for the exact PR head and verification docs distinguish browser simulation, stable tests, nightly campaign and unverified broader claims.
10. Release remains Hold and human pilot, unsafe variance/dyn breadth, live dependency assurance, publication and production operations remain listed as open.

## Risks and mitigations

- **Scope expands into a general fuzz platform:** retain one existing target and one known production mutant; only the deliberately bounded deletion reducer is new machinery.
- **Decoder refactor changes tested domain:** byte-level adapter tests and existing oracle tests must pass before updating the target; preserve existing query-lossy/body-raw distinction explicitly.
- **Randomness produces flaky evidence:** keep campaign seed and budget, use checked-in regression and deterministic reduction for required negative controls; never assert exact coverage or discovered corpus contents.
- **Nightly diagnostics drift:** pins and fixture-specific failure identity, plus parser unit tests; drift is infrastructure failure, not a learner error.
- **Oracle shares the production bug:** share only harness plumbing, not selection algorithm; retain independent distance/mask oracle and full-output mutant sensitivity.
- **New source IDs inflate counts:** source counts come from validators, deduplicate only as relevant to this module.
- **Stable failure confused with nightly coverage:** record toolchain per phase; run the stable regression separately on 1.85.0.
- **Automated checks mistaken for learning evidence:** explicitly leave pilot open; no seniority or mastery claim from CI.

## Primary references checked for planning

The [Rust Fuzz Book guide](https://rust-fuzz.github.io/book/cargo-fuzz/guide.html) describes target execution and passing libFuzzer options. The [LLVM libFuzzer reference](https://llvm.org/docs/LibFuzzer.html) documents bounded execution, corpus and replay behavior. These references support tool mechanics, not the claim that a short campaign proves correctness. Recheck relevant pinned-tool behavior when implementing; the exact package and verifier source remain the baseline for this milestone.
