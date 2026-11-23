# Concurrency and module search — implementation plan

[Polski](2026-09-12-concurrency.pl.md)

Teach learners to start and join threads, transfer ownership through channels, and update shared state with Arc/Mutex. Make topics easier to find as the course grows.

Three content modules use existing evaluators, v3 persistence, and retrieval exercises. The threads, channels, and synchronized-state modules follow shared-ownership. Search filters existing cards by names, descriptions, and lesson topics while preserving module numbering and the learner's place. Async and atomics/Loom have separate stages in the roadmap.

This stage follows the original brief, the later update to the learner profile, and parts 15–18 of `docs/advanced-curriculum.md`. The user approved continuation and a commit after the major stage.

## File contracts

1. `src/content/threads.ts` exports `threadsLessons`, `threadsConcepts`, `threadsCompetencies`, `threadsSources`, `threadsReviewExercises`, and `threadsModule`. Module `threads` requires `shared-ownership`. Lessons and concepts are `thread-join` (after the `weak-links` lesson and concept), `thread-move`, and `scoped-threads`. Teach spawn and JoinHandle, child panic as a join result, moving data and E0373/E0382, and borrowing data without cloning in a scope. Each concept has two independently tested tasks, including at least one without starter code.
2. `src/content/channels.ts` uses the `channels` export prefix. Module `channels` requires `threads`. Lessons and concepts are `channel-ownership` (after `scoped-threads`), `channel-lifecycle`, and `channel-backpressure`. Cover mpsc, dropped senders or receivers, draining buffered items before completion, dropping all senders, sync_channel, Full/Disconnected, and recovering the unsent item. Starters must terminate. Tests synchronize explicitly and avoid timing as performance evidence or promises about ordering across producers.
3. `src/content/synchronized-state.ts` uses the `synchronizedState` export prefix. Module `synchronized-state` requires `channels`. Lessons and concepts are `send-sync` (after `channel-backpressure`), `mutex-state`, and `mutex-recovery`. Cover Rc and Arc, Send/Sync and E0277, the fact that Arc leaves the safety requirements of its contents intact, MutexGuard and critical sections, releasing before invoking a callback or joining, checking overflow before any partial update, and mutex poisoning as a warning with an explicit policy to reject or restore the invariant. Leave manual unsafe impl and executable deadlocks out of the exercises. Tests preserve stated invariants regardless of which thread wins.
4. The lead integrates criteria in `src/content/course.ts`, implements and tests `src/engine/module-search.ts`, and updates the module picker, `overview.tsx`, and CSS. End-to-end tests cover search, selection behavior, access to fresh alternatives, and Resume. The query is local view state and needs no persistence migration. Search ignores case and Polish diacritics and requires all terms to match. Its index excludes solutions and learner drafts.

## Evidence rules

- Use authored Rust 2024 programs with the standard library, a small fixed thread count, and bounded data. Imported code and learner drafts stay outside local execution. External Playground checks await separate approval.
- Every prediction uses concrete code or a complete scenario. Claim exact stdout only after ordering results with joins or channels. Avoid claiming a particular scheduler order.
- When the contract requires a callback on a new thread, verify it using ThreadId. Join every child after errors as well, and avoid an early `?` return that would detach the remaining children.
- Provide two independent alternatives and active retrieval practice with meaningful tests for every criterion. Timeouts do not qualify as starter rejection.
- Empty-editor tasks have no starter or signature and state the required API names and types. The first hint names the area, the second gives the rule, and the solution shows concrete code.

## Stages

- [x] Write search and criteria integration tests and observe their initial failures.
- [x] Authors provide modules in separate files and verify authored fixtures against primary sources.
- [x] Integrate modules and search into the UI and verify the functional tests pass.
- [x] Independently review content, concurrency contracts, starters, hints, and tests.
- [x] Run lint, TypeScript, Vitest, content validation, Rust checks, source checks, the build, and E2E. Manually verify mobile, keyboard use, and offline behavior.
- [x] Update the audit, roadmap, and verification report, then commit locally.

Verification covered 110 Vitest tests, 28 E2E scenarios, all 1079 Rust cases, and another 44 cases in the changed module after final review. Sixteen mutants were rejected and 143 sources were reachable. Build and offline v11 passed. The plan belongs to this stage's commit within the ongoing course. See `docs/verification.md` for details and limits.
