# Borrowed callbacks implementation plan

> For agentic workers: use subagent-driven-development; new implementers and reviewers use GPT-5.6-Luna high. Root owns integration and release. The user has already authorized continued course development and milestone commits/PRs/merges.

**Goal:** Teach practical variance and higher-ranked borrowed callback contracts through four independently assessed lessons.
**Architecture:** Two content files author two lessons each; one module file wires them into the existing curriculum and assessment engine. Existing trusted Rust verifier, runner, persistence and project catalog remain in place.
**Tech Stack:** TypeScript/Next, std-only Rust 2024, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-09-13-borrowed-callbacks-design.md`.

## Global constraints

- Module `borrowed-callbacks`, after `closures`; module prerequisite `closures`.
- Ordered IDs: `variance-shared-views`, `variance-mutable-slots`, `hrtb-local-visitors`, `hrtb-borrowed-projections`. Same lesson and concept IDs.
- First lesson prerequisite `closure-contracts`; first concept prerequisite `callable-contracts`. Following new IDs form a chain.
- Each lesson supplies primary `${id}-gate`, independent `${id}-blank` with no starter/signature, and a fresh coding review. Blank prompts name the API and complete behavior in prose, not a pasted Rust signature.
- All Rust is std-only Rust 2024. Use actual observed diagnostics and compiler client tests. No regex proof of lifetime/variance, unsafe, leak-based fixes or unannounced implementation restrictions.
- Preserve old IDs, saved evidence, runner and persistence v3. No new Cargo package or dependencies. Eight projects and packages remain.
- Polish copy assumes basic programming and no prior Rust. Source metadata reviewedAt `2026-09-13`.
- Execute only authored fixtures, never learner/import Rust or Playground POST. No host deployment or external package publishing.
- Work on a separate feature branch based on verified commit 451e3a3 while PR #7 completes CI; finish merging PR #7 before publishing this next block. Parallel authors own disjoint files; user preference for parallel agents supersedes generic sequential workflow guidance. Authors do not commit; root commits reviewed milestone.

## Task 1 — shared variance and mutable slots

**Files:** create `src/content/borrowed-variance.ts`.
**Produces:** `borrowedVarianceLessons`, `borrowedVarianceConcepts`, `borrowedVarianceCompetencies`, `borrowedVarianceSources`, `borrowedVarianceReviewExercises`.

Read spec sections Integration, Lesson 1, Lesson 2 and Sources/evidence. Use existing `src/content/guessing-core.ts` and `src/content/lifetimes.ts` for the content schema; do not import neighboring content or course.ts. Use the exact primary API and blank behavior from the spec. Add fully specified review contracts in distinct domains.

- [x] Write hidden tests and compiling unfinished starter for both primary APIs before references. Include generic lifetime conversion of Label/Samples, pointer identity, Unicode/prefix bounds and repeated short mutable reborrows. Verify intended failure; preserve command/output in report.
- [x] Implement reference APIs and prove both hidden suites pass. Add independent blank and review references with boundaries and short local owners, then verify every reference.
- [x] Author predictions, executable observations and explanations. Verify rejected subtyping/assignment examples with real Rust 2024; distinguish outer mutable lifetime covariance from content invariance. Explain type `'static` bounds accurately.
- [x] Format Rust snippets and TypeScript, then run trusted verification on only this file's lessons/reviews using `verifyTrustedRust({ lessons: borrowedVarianceLessons, reviewExercises: borrowedVarianceReviewExercises, traces: {} })`. Every result must pass; two shared verifier checks are not additional lesson cases.
- [x] Self-review complete learner contracts and provide evidence/report. Root dispatches independent review and covers fixes before task completion.

## Task 2 — local visitors and borrowed projections

**Files:** create `src/content/borrowed-hrtb.ts`.
**Produces:** `borrowedHrtbLessons`, `borrowedHrtbConcepts`, `borrowedHrtbCompetencies`, `borrowedHrtbSources`, `borrowedHrtbReviewExercises`.

Read spec sections Integration, Lesson 3, Lesson 4 and Sources/evidence. The prior new lesson/concept is `variance-mutable-slots`; do not import task 1's file. Use exact contracts inspect_owned/inspect_until/project_lengths/find_projected_size. Add fresh reviews as specified.

- [x] Write hidden tests against compiling TODO starters before reference implementation. Require short-lived inputs, captured non-static state, FnMut call traces and non-Clone owned result/error types. Inspect-until and optional projection must stop at the stated first result; distinguish None and Some(0).
- [x] Observe intended failure, then implement references and compile/run all primary, blank and review suites. Include Unicode byte lengths, empty records and a valid static fallback projection. Reject invented claims that lifetime annotations establish substring provenance.
- [x] Create discovery cases for caller-chosen versus universal lifetime and fixed R versus borrowed output. Check actual diagnostic with rustc; include full runnable code and correct explanation. Accept elided equivalent bounds and explain function-item/closure inference when needed.
- [x] Format all Rust snippets and TypeScript. Run `verifyTrustedRust({ lessons: borrowedHrtbLessons, reviewExercises: borrowedHrtbReviewExercises, traces: {} })`, preserving output and intended failure evidence.
- [x] Self-review prompts against hidden tests and report exact results. Root dispatches independent review and covers fixes.

## Task 3 — integration, learner evidence and release

**Files:** create `src/content/borrowed-callbacks-module.ts`, `src/content/borrowed-callbacks-integration.test.ts`; modify `src/content/course.ts`, `tests/e2e/module-resume.spec.ts`, `scripts/verify-offline.mjs`, `public/sw.js`, current README/audit/progress/verification/curriculum docs.
**Consumes:** both content files' five named exports above.

- [x] Add a failing integration test for module registration and genuine independent gate behavior. Reveal all four primary steps, require each blank to remain unexposed, confirm primary revealed evidence cannot pass the module and independent blank evidence can. Preserve an unrelated saved prior lesson draft.
- [x] Register module after closures, append both files' lessons/concepts/competencies/sources/reviews in that section, add roadmap availability and avoid changing old IDs/prerequisites. Use four gate criteria with primary/blank refs.
- [x] Extend production module-resume E2E and unvisited offline lesson check; bump cache to v23. No project reference test is added because no package changes.
- [x] Review both author outputs independently, fix contract/test gaps and review integration. Read relevant local Next guide before changing app wiring.
- [x] Run lint/typecheck/Vitest/content, full authored Rust, source audit, production build/E2E/offline. Existing CI reruns Tokio/Loom/Cargo/MSRV/fuzz before release. Do not repeat unrelated expensive local suites unless a change or failure justifies it.
- [x] Update current stats and coverage honestly. Keep Cargo/publication, unsafe/GAT/advanced variance, performance and operational curriculum gaps. Record preceding Number Guessing PR/CI evidence and new verification limits.
- [x] Commit/push, open PR, verify all three jobs for exact head, merge and confirm main. Leave overarching course goal open.

## Preflight and rulings

| Boundary | Verification |
| --- | --- |
| Task 1 internal | Two lifetime skills have different contracts; shared covariance witnesses and mutable-slot reborrow clients test type behavior, not only output equality. |
| Task 2 internal | Fixed owned R and universally borrowed output are separate contracts. Optional/Result transfer changes call policy or failure semantics. |
| Task 1 → Task 2 | Exact ordered lesson/concept ID chain; no cross-file imports or shared helper ownership. |
| Tasks 1/2 → Task 3 | Five named exports per content file; same IDs are used for gates and review mapping. |
| Task 3 → persistence | New keys only; no migration needed, existing v3 remains. |
| Task 3 → CI | Existing full authored verifier discovers registered content. No dependency, package or workflow expansion necessary. |

Ruling: split variance into shared views and mutable slots, then distinguish owned callback results from borrowed projections. This yields four separate teachable contracts instead of a final lesson that merely repeats earlier callback repair. Cost is leaving unsafe/PhantomData/GAT coverage for a later explicit stage.

Cache ruling: v21 was exposed by the previous production server while its HTML still contained the older catalog. Stop that server before final build and release with v22 so a client cannot reuse the temporary mixed-version cache. No learner IndexedDB data is cleared.

Final UI copy pass: clarify invariance of the contained type rather than immutability of the value, and fix replace_window empty-range prose (store empty, return the previous view). Rust fixtures unchanged. Final cache v23 carries this copy after the reviewed v22 production build.

Final local evidence:122 lessons/33modules/125concepts/77blanks/249sources/8projects.172 Vitest in37 files, lint/TS, fullRust1397 plus final affected56, sources249HTTP200, productionbuild,47E2E withoutretry, finalcopybuild+1affectedE2E, offlinev23/all8ZIPs andmanualUIkeyboard/consoleclean. No executionoflearner/importRust. Readyforcommit/PR/exactheadCI.

Release: PR #8 merged as57c24f905e94c04ca8629add5eb67eac246749f4 after all three CI checks passed for236a09e (automatic run34750981784; manual run34750956776 also passed). The merge tree exactly matches the tested head. The final documentation commit translates README and records English commit/PR metadata. Local main synchronized before starting the next Cargo feature branch.

Post-merge main CI34751446523 passed all three jobs for57c24f9.
