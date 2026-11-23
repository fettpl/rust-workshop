# Number Guessing+ implementation plan

[Polski](2026-09-13-number-guessing-plus.pl.md)

> For agentic workers: use subagent-driven-development with the current user-selected GPT-5.6-Luna high for new delegations and independent reviewers. Root owns integration and release; do not commit from an author task.

**Goal:** Complete the first portfolio project as a playable, tested random-secret CLI while preserving existing learner state.
**Architecture:** Four data-driven lessons and an enhanced existing ProjectContract, with one downloadable lib/bin Cargo package and an isolated maintainer verifier.
**Tech Stack:** Existing TypeScript/Next app, Rust 2024, pinned rand 0.10.2, Vitest, Cargo and Playwright.
**Spec:** `docs/superpowers/specs/2026-09-13-number-guessing-plus-design.md` is authoritative for exact semantics and interfaces.

## Global constraints

- Preserve project ID `number-guessing-result-message`, old lessons/steps and persistence v3.
- Module `number-guessing-plus`; four IDs in the spec; primary `-gate` and fresh `-blank` per lesson.
- Keep inline exercises std-only; genuine random play and process tests belong to the Cargo artifact.
- Test repository-authored fixtures only; no learner/import execution or Playground POST.
- All new agents use Luna high per the latest goal update; already-dispatched authors began under the preceding Terra medium instruction. Reviews examine correctness and independent transfer, not only test totals.

## Task 1 — parsing and state lessons

Own `src/content/guessing-core.ts`. Produce `guessingCoreLessons`, `guessingCoreConcepts`, `guessingCoreCompetencies`, `guessingCoreSources`, `guessingCoreReviewExercises`.

- [x] Write hidden tests for `guess-input-contract` and `guess-round-state` per exact parser/state contracts; observe intended failures before reference implementation.
- [x] Author prediction/run/explanation/primary repair/blank for each. First prerequisite `testing-quality-workflow`; second depends on first. Provide different-domain transfer with changed constraints and fresh coding reviews.
- [x] Run trusted verification on only these lessons/reviews; preserve failures and final results. Review test boundaries and source metadata.
- [x] Independent reviewer confirms spec and quality; repair findings.

## Task 2 — stream and randomness lessons

Own `src/content/guessing-io.ts`. Produce `guessingIoLessons`, `guessingIoConcepts`, `guessingIoCompetencies`, `guessingIoSources`, `guessingIoReviewExercises`.

- [x] Write failing tests for `guess-session-io` and `guess-random-boundary`. First depends on `guess-round-state`; second on session.
- [x] Author the full lesson sequence. Test prompt/flush before read, EOF and errors with deterministic std adapters. Explain that injected closure tests prove call policy, while the real random dependency/CLI is checked separately in Cargo.
- [x] Add independent blank and review contracts with changed behavior, execute references and intended failures via the trusted verifier.
- [x] Independent reviewer confirms spec, error handling and meaningful transfer.

## Task 3 — playable Cargo package

Own `src/content/projects/number-guessing.ts`, `src/content/projects/number-guessing/archive.ts` and package-focused tests. Produce `numberGuessingPackage`, `numberGuessingProject`; enhanced project imports/spreads the legacy catalog project without importing course.ts.

- [x] Write real Rust tests against compiling TODO starter for all spec contracts, then implement reference. Use generated Cargo.lock, pinned rand, private Game state, pure parser and generic stream adapters.
- [x] Implement actual CLI, documentation, exact transcripts and an adaptive bounded bisection process test for random default play. Preserve library errors and correct terminal state.
- [x] Run actual extracted archive fmt/check/test/Clippy and all negative cases; test starter compiles but does not pass unfinished behavior.
- [x] Add README explaining standard random play, deterministic practice mode, failure/limit boundaries and source versions. Reveal only the four primary lesson gates.
- [x] Independent reviewer checks entire archive and learner/project fidelity.

## Task 4 — integration, mutants and release

Root owns `src/content/guessing-module.ts`, `course.ts`, integration test, dedicated `scripts/verify-number-guessing.ts` and mutants, package.json/CI, docs, E2E/offline and cache version.

- [x] Add red integration checks: same legacy project ID/index/export, old notes/resume survive export/import, new package exists, four gates each retain a fresh blank after reveal.
- [x] Register module after testing, lessons/concepts/reviews/sources, enhanced project and roadmap. Confirm green validation.
- [x] Add fixed authored mutant checks with exact failure evidence. A dedicated verifier accepts only optional --fetch and --msrv, extracts this exact package, fetches locked dependencies when requested, then runs offline checks/mutants. CI invokes it before generic package verification and in the existing MSRV job with pinned tools.
- [x] Extend module-resume/project-reference/offline checks and preserve user data. Review browser navigation/keyboard/console on a final production build.
- [x] Run lint, typecheck, Vitest, content/Rust/Tokio/Loom/Cargo verification, source audit, production E2E/offline; independently review final integration.
- [x] Update all coverage/audit/verification docs without claiming full advanced-course completion; include prior PR #2/CI evidence and correct duplicate local verifier count.
- [x] Commit, push, create PR to main, inspect exact-head CI and merge. Leave the full course goal open.

## Preflight and rulings

| Tasks/interfaces | Check and resolution |
| --- | --- |
| 1 → 2 | Four chained lesson/concept IDs fixed in spec; authors do not import each other. |
| 1/2 → 4 | Same named exports and primary/blank IDs; only root edits course registration. |
| 3 → 4 | Export package/project; root scopes fetch/mutations to that package and uses authored source only. |
| 1/2 ↔ 3 | Primary semantics share spec; independent transfer intentionally differs and is not revealed by package. |
| 4 ↔ legacy | Retain project ID, original lessons and evidence keys. Enhance course.project and projects[0] together; no duplicate first project. |
| All | Existing feature checkout already separates work from main; no additional checkout or dependency reinstall is needed. Prior PR code is unchanged and its local/CI baseline passed. |

Previous goal turn made progress: committed/pushed Mini grep + CI, merged PR #2, and independently audited the next original-brief gap. This plan executes the chosen gap; it does not redefine the full goal.

## Local verification and review outcome

- 171 Vitest tests / 36 files; lint, typecheck and production build pass.
- Full authored Rust: 1343/1343; final four-lesson delta: 46/46 (includes two shared verifier checks, not additional unique cases).
- Tokio 252/252, Loom controls, all eight Cargo archives, exact Rust 1.85 workspace and guessing checks, four guessing mutants, Mini grep fuzz and replay pass.
- Source audit 237/237 HTTP 200; production E2E 46/46 without retries and offline cache v20/eight ZIPs pass. Manual UI checked lesson contract, formatted code, keyboard tabs and empty warning/error console.
- Luna high reviews covered core, IO, package, integration/CI and learner-facing contracts; root fixed reported gaps.
- Root additionally reproduced/fixed OutputReader cleanup with a full channel, removed an unknown MSRV lint and preserved old project step ordering. The Cargo integration test received its own bounded 120-second timeout after a valid compilation run exceeded the unit default 5 seconds; the Todo E2E now selects its project explicitly.
- Broader course goal remains open. Hosting is still unspecified; no deployment or repository visibility change.

Release check: commit 8d9536e and PR #7 created. CI run 34748982169 passed MSRV and fuzz but failed starter TODO detection because Cargo stopped after early CLI test failures. Both starter verifiers now require all suites with --no-fail-fast, preserving the explicit unfinished-behavior assertion; the corrected head must pass the full CI before merge.

Release completed: corrected head 451e3a3 passed verify, workspace-msrv and mini-grep-fuzz in run 34749313613. PR #7 merged at f94b87e after GitHub merge APIs repeatedly returned HTTP 500; an ordinary merge in a clean temporary worktree produced a tree identical to the tested head, then a non-force push updated main. GitHub confirms merged=true. Post-merge main run 34749710087 succeeded in all three jobs.
