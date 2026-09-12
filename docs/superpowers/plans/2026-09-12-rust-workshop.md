# Rust Workshop Implementation Plan

> For agentic workers: use subagent-driven-development to implement bounded tasks, with independent domains in parallel.

**Goal:** Complete and verify the ownership vertical slice in the user brief.
**Architecture:** Shared typed content contracts, pure learning engine, isolated runner adapter, versioned local state and composable UI.
**Tech Stack:** Next.js, React, TypeScript strict, Tailwind, Monaco, IndexedDB, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-09-12-rust-workshop-design.md

## Global constraints
Rust stable, edition 2024. Polish UI. No arbitrary local code execution. No progress reset on migration. No mastery from clicking done. No expansion beyond first slice before review.

## Tasks
- [x] 1. Root: scaffold project and shared contracts in src/domain/types.ts. Install current dependencies, pin lockfile.
- [x] 2. Content agent: src/content/*.ts, scripts/validate-content.ts, scripts/verify-rust.ts and content tests. Complete module and project data, source metadata, trace fixtures. Validate relationships and verify every authored runnable example including deliberate errors.
- [x] 3. Engine agent: src/engine/*, src/persistence/* and their tests. Test first: unaided gate evidence stronger than reveal; duplicate events cannot inflate; delayed review required for retention; v1 migration preserves drafts/notes; invalid imports reject. Implement pure evaluators, mastery/review and storage.
- [x] 4. Runner agent: src/runner/*, src/app/api/run/route.ts and runner tests. Verify official upstream interface, test success/compile/runtime/test/timeout/infrastructure distinctions, request limits, no local child processes, preserve stderr.
- [x] 5. Root: src/components/* and app shell/styles. Onboarding, diagnostic, dashboard, course contract/map, data-driven lesson workspace, Monaco/output/coach, trace controls, journal, review, project, assessment, settings. Persist exact step and drafts on every action. Add PWA shell and icons.
- [x] 6. Integration: run npm run lint, npm run typecheck, npm test, npm run content:check, npm run content:rust, npm run build. Address failures at their owning boundary.
- [x] 7. Browser: add tests/e2e flows, run desktop/mobile keyboard and reload checks, inspect console and actual screenshot. Live runner smoke. Audit educational quality and fix gaps.
- [x] 8. Documentation: README setup/limitations, architecture, runner trust boundary, source maintenance and reproducible verification. Record final acceptance evidence in docs/verification.md.

## Interface and review ledger
Task 1 produces types consumed by tasks 2–5; types are the sole shared interface, root owns schema changes. Tasks 2, 3 and 4 own disjoint files. Task 5 consumes those exports. Task 6 integrates; task 7 audits observable behavior. No contradictory ownership.

Ruling: execute in the empty supplied repository; a second empty worktree offers no isolation benefit and there are no pre-existing user changes.
Ruling: the detailed user brief authorizes implementation decisions and asks autonomous iterative work. No extra approval round for this reversible local implementation.
