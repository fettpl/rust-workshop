# Macros as APIs Implementation Plan

[Polski](2026-09-25-macros-as-api.pl.md)

> For agentic workers: implement task by task with TDD, focused review, and frequent English commits. All implementation, tests, documentation changes and Git operations use GPT-5.6-Luna high. GPT-6-Astra medium owns planning and qualitative review.

**Goal:** Add three Polish declarative-macro lessons and trustworthy stable/MSRV evidence that their external-client contract works.

**Architecture:** Content remains single-source browser Rust with primary/blank/review evidence. A separate std-only authored Cargo fixture verifies exported macro behavior from an external crate. Registration and CI preserve existing project archives and IDs.

**Tech Stack:** Next.js 16.3.5 catalog, TypeScript strict, Vitest, Playwright, Rust 2024 edition, Cargo stable and Rust 1.85.0.

**Spec:** `<private-temp>/receipt-016` (copy into `docs/superpowers/specs/` on the integration branch).

## Global constraints

- Base new worktrees on `d0210272c38ca13699621d412f085662fff4ec2c` (PR #26 head), not the dirty local `main` branch.
- Read the relevant `node_modules/next/dist/docs/` guide before writing code, per AGENTS.md.
- Learner copy Polish; README/commits/PR English; no language-specific prior-experience assumption.
- No new dependency, user-code execution, registry publication, or alteration to existing project ZIP bytes and progress IDs.
- Exact Rust 1.85.0 and stable are separate local evidence; failed GitHub Actions remain blocked until the account state changes.

## Task 1 — Course content and gate contracts

Create `src/content/macros-as-api.ts`, focused integration/assessment tests, and the minimal `src/content/course.ts` registration/count updates. Use three lessons: exactly-once capture, repetition grammar, and exported hygienic paths / 2024 fragment matching. Each lesson must include predict, run/observe, explain, modify gate, debug, blank transfer and distinct delayed review. Hidden tests should reject a trivial stub, duplicate evaluation, wrong sequence order, no empty/trailing support, unqualified macro path (within single-source limits), and wrong 2024 fragment matcher. Verify every marked-correct source compiles and every deliberate error has the named diagnostic. Give each concept a separate gate OR blank criterion. Run focused Vitest, content validation/audit, Rust content verifier as appropriate, typecheck, lint. Commit English.

## Task 2 — Trusted external-client verifier

Create `scripts/fixtures/macro-contracts/{Cargo.toml,Cargo.lock,macro_contracts,external_consumer}` (exact names may be adjusted before code), `scripts/macro-contracts-verifier.ts`, `scripts/verify-macro-contracts.ts`, focused verifier tests, npm scripts, and stable/MSRV CI steps before generic archive checks. The workspace is std-only with Rust 2024/resolver 3 and `rust-version = "1.85.0"`. Test external shadowing, once/order with counters, 0/1/N entries and trailing comma, and `const {}` under `:expr`. A positive scenario must run real Cargo check and test. Controlled mutants must be rejected for the specific compile or behavior reason; report validation must reject forged passed JSON missing linked commands, wrong current fixture hashes, stale/mismatched toolchain, or infrastructure results. Bound subprocess time/count/output and use offline/locked Cargo. Run verifier tests and stable/MSRV commands. Commit English.

## Task 3 — Browser/offline and documentation

After Task 1 is available, add `tests/e2e/macros-as-api.spec.ts` and a bounded addition to `scripts/verify-offline.mjs`. Production mock success depends on exact authored code and corresponding tests; unexpected code returns schema-valid `test-failure`. Exercise each module criterion, revealed primary versus independent blank, draft/note resume, mobile keyboard/axe/console. Offline demonstrates exact resume and compiler-unavailable state, not a real Cargo proof. Update `README.md` and `docs/{advanced-curriculum,requirements-audit,progress,verification}.md` with computed catalog counts, verified scope and CI billing limit. Run targeted Playwright, full offline smoke, formatting checks. Commit English.

## Integration and finish

Cherry-pick independently reviewed Task 1/2/3 commits into a clean integration worktree based on PR #26. Run full Vitest, typecheck, content check/audit, lint, build, stable/MSRV verifier, production E2E, offline smoke and `git diff --check`. Resolve failures before publication; do not repeat unchanged suites without cause. Qualitative review checks the five spec risks and documentation honesty. Push new remote branch and create a draft English PR based on `feat/api-release-matrix-milestone`. Attach the PR artifact. Record exact-head status but do not merge while Actions jobs fail before starting.
