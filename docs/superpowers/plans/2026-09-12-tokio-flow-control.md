# Tokio: flow control, cancellation, and shutdown — implementation plan

[Polski](2026-09-12-tokio-flow-control.pl.md)

> Implementers use subagent-driven-development. The lead reviews contracts and implementation. The user authorized independent development of the full course and a commit after the major stage.

Teach learners to bound a buffer, retain ownership of a message when sending is cancelled, distinguish a timeout from stopping an independently spawned task, and shut down a pipeline with every child accounted for.

Use the existing Lesson/Concept/Module/ProjectContract types, pure evaluators, and coding retrieval exercises. Author content separately from integration. The fixed Cargo profile checks repository examples only. RunRequest keeps its existing contract.

The stack is stable Rust, edition 2024, Tokio =1.53.1, strict TypeScript, Next.js, Vitest, and Playwright. Check primary sources for any additional features or test clock.

Follow docs/advanced-curriculum.md part 17 and the Async/Tokio contract, docs/requirements-audit.md, and the original product brief.

The baseline at c57b3b1 had 90 lessons, 25 modules, and 93 concepts. The previous stage was committed and pushed after local and offline testing. CI 34719230345 failed again on retry. The separate diagnostic commit 32a0dc6 passed full CI 34719780947. The cause of the two previous failures remains unconfirmed.

## Constraints

- Learners know basic programming and started with no Rust experience. Assume no knowledge of specific other languages.
- Keep learner drafts and imports out of local execution. Browser tests use controlled responses in place of sending examples to the external Playground.
- Base correctness on events, controlled polling, and resources observed outside the solution. Mere sleeps, scheduler order, or process timeouts do not establish correctness. Use virtual time where available.
- Each concept has two different coding assessments, including one with an empty editor, and a coding retrieval exercise. Correct implementations pass, and the relevant contract rejects starters and intentional faults.
- Exercises use the actual external runtime APIs. Direct polling observes a real Future.
- Revealing a project applies assistance to related tasks only and leaves fresh variants independent.

## Tasks

- [x] Check the Tokio 1.53.1 docs.rs documentation for mpsc send/reserve/close, timeout, select, and JoinHandle. Read the source to confirm external Playground prelude features. Define a deterministic time-test contract.
- [x] Extract existing step builders unchanged from tokio-runtime-tasks.ts into tokio-helpers.ts. Verify data parity and integration tests.
- [x] In src/content/tokio-channels.ts, add tokio-bounded-channels after tokio-join-outcomes, then tokio-reservation-cancellation. Both belong to tokio-flow-control with exports tokioChannelLessons/Concepts/Competencies/Sources/ReviewExercises. Teach bounded channels, close and drain, reservation before moving a message, and recovery of unsent data.
- [x] In src/content/tokio-time-select.ts, add tokio-timeouts after tokio-reservation-cancellation, then tokio-select-cancellation in the same module. Export tokioTimeLessons/Concepts/Competencies/Sources/ReviewExercises. Distinguish dropping an owned Future from timing out while awaiting a handle. Preserve the in-flight operation across select iterations and state the priority policy and cancellation safety.
- [x] In src/content/tokio-shutdown.ts, add tokio-graceful-shutdown after tokio-select-cancellation with retrieval practice and two coding assessments. Export tokioShutdownLessons/Concepts/Competencies/Sources/ReviewExercises. Stop accepting work, drain accepted messages, join all tasks, and retain errors explicitly.
- [x] Add src/content/projects/tokio-pipeline.ts as a practical lab combining earlier skills alongside the five original portfolio projects. Use a bounded pipeline with controlled shutdown, processing errors, and complete results. Test buffer overflow, cancellation, empty input, errors, and joining all children. The starter compiles and fails the behavior contract. The solution passes test/fmt/clippy. Pin the lockfile and require assessed work for mastery.
- [x] The lead registers content and the module in course.ts and extends the verified Cargo profile, validation, and contract tests. Add a failing integration test before registering the module.
- [x] The lead reviews all solutions and tests compiling faulty variants. Timeouts or unrelated compiler errors earn no credit.
- [x] The lead runs browser tests for new lessons and the project, raw output, reveal, a fresh alternative, Resume, and mobile. Verify PWA cache v15 and a previously unopened offline task.
- [x] Run lint, types, Vitest, content validation, trusted Tokio examples and packages, source checks, build, and relevant regressions. Capture CI from the previous stage. Reflect the remaining advanced and senior scope in the audit.
- [x] Conduct a critical review, make corrections, and update the verification report. Commit the stage with this plan and push according to the user's instructions.
