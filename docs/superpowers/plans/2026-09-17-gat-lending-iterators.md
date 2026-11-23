# GAT and lending iterators implementation plan

[Polski](2026-09-17-gat-lending-iterators.pl.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Authors use GPT-5.6-Luna high; reviewers use GPT-6-Astra medium. Root owns shared integration and release.

**Goal:** Teach receiver-bound item families, overlapping mutable views, associated capabilities and lazy owned adapters through four independently assessed lessons.

**Architecture:** Two independent content files export lessons and metadata into the existing catalog. A module joins four primary/blank criteria. Existing Rust execution, persistence and review scheduling remain authoritative; fixed maintainer-only assessment fixtures test grading quality outside the browser bundle.

**Tech Stack:** TypeScript, std-only Rust edition 2024, Rust 1.85.0 and current stable, Vitest, Playwright, existing Next.js application.

**Spec:** `docs/superpowers/specs/2026-09-17-gat-lending-iterators-design.md`.

## Global constraints

- Module `gat-lending-iterators`, immediately after `iterators`; module prerequisites `borrowed-callbacks` and `iterators`.
- Ordered lesson/concept IDs: `gat-receiver-borrows`, `gat-overlapping-mutable-windows`, `gat-item-capabilities`, `gat-owned-iterator-adapters`.
- First lesson/concept prerequisites: `hrtb-borrowed-projections`, `iterator-contracts`; following lessons/concepts form the ordered chain.
- Primary `${id}-gate`, source-free `${id}-blank`, separate `${id}-review`. Each primary and blank has `evidenceGate: true` and a Rust tests evaluator. Reviews are independently coded retrievals.
- Concepts use `evidenceArtifact: "rust-code"`. Producer source IDs are `gat-reference-associated-items`, `gat-slice-windows`, `gat-gats-stabilization`, `gat-error-e0499`; consumer IDs are `gat-reference-trait-bounds`, `gat-reference-dyn-compatibility`, `gat-iterator`, `gat-error-e0038`. Each source is registered once; lessons may reference either group's IDs.
- Learner copy is Polish; README, commits and PRs remain English. The audience needs basic programming knowledge; the course teaches Rust from zero. Rust snippets use only std, edition 2024 and Rust 1.85-compatible features.
- No unsafe, leaked allocations or unnecessary Copy/Clone/Default/'static bounds. Declare implementation restrictions in learner prompts and enforce only the announced restrictions.
- Preserve old IDs, progress schema v3, all eight projects and packages. No new dependency, execution endpoint, arbitrary-input author CLI or imported learner execution.
- Execute only fixed authored sources. No live Playground POST, external publication or new deployment target.
- Canonical answers and harmless equivalents must pass. Semantic mutants must compile successfully, then fail behavioral assertions; compilation failure is not a substitute.
- Broad course goal remains open. Completion of this module does not prove professional readiness or full advanced coverage.

## Task 1: Receiver-bound producers and mutable windows

**Files:** create `src/content/gat-producers.ts`, `src/content/gat-producers.test.ts`, `src/content/gat-producer-assessment-fixtures.ts`.

**Interfaces:** Produce `gatProducerLessons: Lesson[]`, `gatProducerConcepts: Concept[]`, `gatProducerCompetencies: Competency[]`, `gatProducerSources: Source[]`, `gatProducerReviewExercises: Record<string, LessonStep>`. The fixture file exports `gatProducerAssessmentFixtures: { id: string; equivalent: string; mutant: string }[]`; each id is one of the six gate/blank/review step IDs. It must not import course.ts or be imported by production content.

- [x] Read the spec's producer contracts and existing `borrowed-hrtb.ts` authoring helpers. Implement no consumer lessons or shared registration.
- [x] Write hidden Rust test strings first. For owned rows preserve empty rows and mutation; occupied slots skip vacancies; reverse retrieval has distinct order. For windows test overlap with non-Copy records, zero/equal/oversized widths, empty input, repeated exhaustion and genuinely local borrows. Prefix and reverse transfers follow their separately specified contracts.
- [x] Verify compiling unfinished primary implementations fail the hidden tests. Keep exact commands and failures in the task report.
- [x] Implement all six references and alternate answers, then rerun the same tests. Do not inspect private representation in tests unless the public contract explicitly requires it; test observations through the promised API.
- [x] Add one compiling semantic mutant for each assessment: skip an empty row, stop at a vacancy, reverse incorrectly, advance a window by width, start prefixes at the wrong length, or use the wrong reverse boundary. Freeze exact source strings in the fixture export above.
- [x] Add discovery/prediction/explanation steps with real compiler observations. Distinguish ordinary immutable external windows from current receiver loans; prove E0499 with an actual authored example. Do not claim GAT itself guarantees references, provenance or fused exhaustion.
- [x] Test the structural assessment contract before export completion, then make it pass:

```ts
for (const lesson of gatProducerLessons) {
  const gate = lesson.steps.find(s => s.id === `${lesson.id}-gate`)!;
  const blank = lesson.steps.find(s => s.id === `${lesson.id}-blank`)!;
  expect(gate.evaluator?.kind).toBe("tests");
  expect(gate.evidenceGate).toBe(true);
  expect(blank.code).toBeUndefined();
  expect(blank.evidenceGate).toBe(true);
  expect(gatProducerReviewExercises[lesson.id].evaluator?.kind).toBe("tests");
}
```

- [x] Run scoped `verifyTrustedRust({ lessons: gatProducerLessons, reviewExercises: gatProducerReviewExercises, traces: {} })` on stable and exact 1.85.0. All cases must pass. Format changed TypeScript and report behavioral/diagnostic evidence; independent review precedes completion.

## Task 2: Associated capabilities and owned adapters

**Files:** create `src/content/gat-consumers.ts`, `src/content/gat-consumers.test.ts`, `src/content/gat-consumer-assessment-fixtures.ts`.

**Interfaces:** Produce `gatConsumerLessons`, `gatConsumerConcepts`, `gatConsumerCompetencies`, `gatConsumerSources`, `gatConsumerReviewExercises`, using the same domain types as Task 1. Export `gatConsumerAssessmentFixtures: { id: string; equivalent: string; mutant: string }[]` for its six assessment IDs, in the separate fixture file. No imports of Task 1 implementation or course.ts.

- [x] Read the spec's capability and adapter contracts. Every standalone exercise includes or requests its complete trait API; no hidden dependency on a previous editor draft.
- [x] Write hidden tests before references. Use both `&mut [T]` and custom AsRef/AsMut item wrappers, non-Copy elements holding local references, and callbacks capturing local state. Test empty items and exact stop/resume semantics.
- [x] Compare report fields directly in source-free tasks; do not accidentally require unstated Debug/PartialEq derives through whole-value assertions. Each blank must describe the complete trait next receiver/output lifetime relation without supplying a Rust function signature.
- [x] For adapters assert zero source polling at construction; each next follows its specified policy; owned results survive further calls and dropping the adapter. Include a source that returns None then Some to enforce the explicit terminal policy, rather than assuming every source is fused.
- [x] Advance source ordinals with saturation at `usize::MAX`, as specified, for primary/blank/review adapters. Do not claim a realistic public-input test reaches saturation; review the bounded arithmetic directly. Private layout remains an implementation choice.
- [x] Verify unfinished implementations fail; then implement all references and harmless alternate implementations. Keep eager mutation and lazy owned iteration distinct.
- [x] Add six compiling behavioral mutants targeting skipped empty items, extra polling after callback stop, incorrect report selection, eager adapter construction, wrong source index or wrong terminal boundary. Store complete authored sources in the fixed fixture export.
- [x] Teach declared GAT capabilities using `SliceLender<T>`. Demonstrate the measured external projection-HRTB limitation without claiming all HRTBs require static. Include the GAT dyn rejection and concrete borrowed-output dyn success as observations, not separate mastery claims.
- [x] Add structural tests matching Task 1's explicit gate/blank/review assertions for `gatConsumerLessons` and `gatConsumerReviewExercises`; no source on blank steps.
- [x] Run scoped `verifyTrustedRust({ lessons: gatConsumerLessons, reviewExercises: gatConsumerReviewExercises, traces: {} })` on stable and exact 1.85.0. Format TypeScript and report actual test outcomes for independent review.

## Task 3: Persistent grading regressions and learner integration

**Files:** create `src/content/gat-assessment.test.ts`, `src/content/gat-lending-module.ts`, `src/content/gat-lending-integration.test.ts`; modify `src/content/course.ts`, `src/content/validate.ts`, `src/content/content-validation.test.ts`, `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs`, `public/sw.js`.

**Consumes:** Both five-export production sets and both fixed fixture exports from Tasks 1–2. Production imports only the content files; the test imports assessment fixtures.

- [x] Add a failing registration/evidence test. Read `cargo-lifecycle-integration.test.ts` and use the course-aware learning facade for actual evidence. Reveal all four primaries, export/import state, confirm no criterion passes from assisted evidence, pass each fresh blank independently, and preserve an unrelated draft and note.
- [x] Implement `gatLendingModule` with the four ordered IDs and primary-or-blank refs. Register all five metadata exports in course.ts at the module's position; keep previous identifiers and ordering intact.
- [x] Accept the official HTTPS Rust blog source used by the approved design. Observe rejection first, then add the exact-host prefix with HTTP, lookalike-host and userinfo regression cases; keep the rest of the source policy unchanged.
- [x] Test the maintainer fixtures using `appendHiddenTests(source, tests)`, a temporary directory and `spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary])`. Require compilation status 0 for canonical, equivalent and mutant; require execution status 0 for canonical/equivalent and nonzero plus a failed test report for mutant. Set bounded compile/run timeouts, inspect errors/signals, and clean the directory in finally. Test accepts no input paths or source arguments from users.
- [x] Assert fixture IDs cover exactly the twelve registered assessment IDs once, then run the persistent test on stable and Rust 1.85.0. Use `RUSTUP_TOOLCHAIN=1.85.0` with the rustup toolchain directory at the front of PATH; confirm `rustc --version` in each recorded run. Do not accidentally test the default nightly as stable.
- [x] Keep the declared GAT compiler floor under CI: in `.github/workflows/ci.yml`, the existing `workspace-msrv` job runs the two GAT content test files and the fixed assessment harness with the directory from `rustup which --toolchain 1.85.0 rustc` prepended to PATH and RUSTUP_TOOLCHAIN=1.85.0. Merely wrapping Node with rustup run can still resolve a non-shim system rustc first. Stable still runs them in the full Vitest suite. Document this scope in `docs/ci-cd.md`.
- [x] Extend production navigation/resume E2E for the new module, preserving a primary reveal and independent blank draft across reload. Stub runner responses; these UI tests do not prove Rust semantics.
- [x] Extend offline verification to open a previously unvisited GAT blank, edit it, reload offline and recover the exact step and text. Keep all eight package byte checks. Increment cache v24 to v25 for the finished new catalog; no IndexedDB reset.
- [x] Read installed Next server/client and lazy-loading guides before changing app wiring. No dynamic import or component refactor is required for content registration.

## Task 4: Verification, documentation and release

**Files:** update `README.md`, `docs/progress.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/verification.md`, this plan. Modify CI only if a demonstrated coverage gap requires it.

- [x] Obtain independent Astra review of both content tasks, persistent tests and integration. Fix important findings, rerun affected checks, and perform a final whole-branch review before release.
- [x] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run content:check`, `npm run content:rust`, `npm run content:audit -- --check-links`, and `npm run build`. Preserve logs and exact totals; do not infer coverage from test counts alone.
- [x] Run production Playwright with zero retries and `npm run test:offline` against the final build. Inspect the new lesson manually for readable prompts, editor behavior and keyboard navigation. No learner Rust is executed locally.
- [x] Update English README counts from the catalog. Explain partial GAT coverage and remaining async lending, unsafe, performance, security and operational curriculum gaps in Polish audit docs. Record Cargo PR #9 and post-merge CI success as previous release evidence.
- [ ] Commit the reviewed milestone in English, push feature branch, open an English PR, and require all three CI jobs to pass for its exact head. Recheck base/head before merge; use `--match-head-commit`.
- [ ] Merge under standing user authorization, fast-forward local main, verify clean state and identical tested tree, then verify all post-merge main CI jobs. Keep the overall goal active.

## Preflight decisions

The standing goal authorizes course development and milestone release; no new approval menu is needed for these routine scope decisions. Continue in the established checkout on `feat/gat-lending-iterators`, based on verified `2a68786`, so the user's preview and existing tooling paths remain stable. Parallel authors own disjoint files. Root may register stable exports while authors finish scoped verification, but release requires their reports and independent approvals. Root owns commits; per-task source commits are consolidated into the requested large milestone. The previous goal turn was progress: Cargo PR #9 and post-merge verification completed.

Before execution, review the finished spec against this plan, resolve exact API or policy conflicts in favor of the spec, and record a task/interface preflight table in the new stage's ignored SDD ledger. Do not dispatch implementation while a required contract is still ambiguous.
