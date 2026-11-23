# Tokio runtime and responsibility for tasks

[Polski](2026-09-12-tokio-runtime-tasks.pl.md)

The async foundations stage was committed at f2b052c. Both GitHub CI runs passed, and PR #1 merged at 64667e4. The previous stage was verified. The full intermediate and senior curriculum remains in progress.

## Approved scope

Four lessons follow async-foundations: tokio-runtime-entry, tokio-spawn-join, tokio-task-boundaries, and tokio-join-outcomes. The tokio-runtime-tasks module uses the actual current-thread runtime and covers spawning independent tasks, Send and 'static requirements, and responsibility for each JoinHandle result. Each concept has two distinct coding assessments, including one that starts from an empty editor, and a coding retrieval exercise. Use Tokio for the runtime and spawned tasks. The later stage covers bounded channels, backpressure, timeout/select, cancellation, and graceful shutdown. Tests acknowledge events explicitly with oneshot.

The project continues the approved roadmap using brainstorming and writing-plans. Use a separate Cargo verifier for repository-authored data. Learner code and arbitrary Cargo.toml inputs stay outside the local runner.

## Responsibilities and contracts

- Agent GPT-5.6-Terra xHigh authors four lessons, concepts, competencies, sources, retrieval exercises, and the module in src/content/tokio-runtime-tasks.ts, with the option to split its own data files. The lead reviews all contracts and solutions.
- The lead owns trustedFixtureTarget metadata, validation, the separate static Cargo profile and verifier with tests, module registration, E2E/offline coverage, documentation, and the commit.
- Verification uses edition 2024 and tokio = "=1.53.1" with macros, rt, sync, and an approved Cargo.lock. Examples for this stage exclude wall-clock time, network use, tokio-util, and uncontrolled dependencies.
- LessonStep may specify trustedFixtureTarget = cargo-tokio-runtime-1.53.1 for author verification. RunRequest retains code/mode/tests. Browser requests provide no dependencies, paths, or manifests.
- The default rustc verifier distinguishes std and Tokio cases and rejects unknown targets. The new verifier imports trusted repository content only, covering visible code, expected errors, starters with tests, solutions, empty-editor tasks, and retrieval practice. Missing tests, timeouts, dependency errors, and infrastructure failures are outside the evidence of rejection.
- Tests distinguish task identity and ownership of task results. They avoid relying on scheduler order, sleeps, a fixed number of yields, or timeout alone. A local Future may borrow data and be !Send. The spawn API defines its own Send and 'static bounds.
- A failed join must leave other task results observable. Dropping a JoinHandle detaches its task. Observe completion through an explicit acknowledgment channel.

## Verification and limits

- [x] Start with tests for independent coding assessments, Tokio validation, and coverage of all four criteria.
- [x] Establish the fixed Cargo profile and Cargo.lock. Fetch dependencies under control, then run all trusted Tokio cases offline and locked.
- [x] Review coding assessments, compiler diagnostics, properties, and independent retrieval exercises. Test deliberate faults.
- [x] Run lint, types, Vitest, content checks, source checks, existing Rust examples, build, and relevant regressions.
- [x] Verify new lessons in the browser, including errors and hints, reveal and empty-editor tasks, Resume and mobile, and offline use.
- [x] Update the original requirements audit and remaining roadmap, then commit the verified stage.

The public GET /meta/crates response on 12 September 2026 listed Tokio 1.53.1 and tokio-util 0.7.19. That observation covered crate versions. Feature flags and prelude stability require separate evidence. Browser tests used controlled runner responses while external Playground submission awaited approval. Local Cargo and rustc received no learner drafts or imports.

The stage had 90 lessons, 25 modules, 93 concepts, 167 sources, and 45 empty-editor tasks. Vitest passed 137/137, rustc 1207/1207, Cargo Tokio 50/50, and E2E 34/34. Assertions rejected nine compiling mutants. Two Tokio scenarios were checked again with axe at 390 px. The production build and offline v14 passed. Details and limits are in docs/verification.md. The rest of the advanced curriculum remains open.
