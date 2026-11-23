# Async foundations — implementation plan

[Polski](2026-09-12-async-foundations.pl.md)

**Objective.** Teach futures, `await`, captures, and cancellation before
exercising the Tokio runtime. This stage follows the approved advanced
curriculum. The later stages still cover a bounded pipeline, timeouts,
`select`, and graceful shutdown.

**Architecture.** The data module uses existing lesson steps, Rust 2024 tests,
mastery evidence, reviews, and exact resume positions. Exercises use real
standard-library futures. Tests explicitly control a finite number of polls.
They exercise language semantics without a Tokio runtime or a custom executor.
Learner drafts and imports never reach local rustc.

**Basis.** The original brief, the authorized course expansion, and stage 17 of
`docs/advanced-curriculum.md`. Start with controlled observations of Pending
and Ready, then integrate Tokio separately. Writing an executor first would
shift attention from learning async to implementing infrastructure. A Tokio
package alone does not meet the curriculum contract without in-app exercises.

## Contracts and files

- Integrate through `src/content/async-foundations.ts`. Store separate lesson
  and review data in `async-ownership.ts` and `async-cancellation.ts`.
  Keep the asyncFoundationsLessons, Concepts, Competencies, Sources,
  ReviewExercises, and Module exports as the boundary with course.ts.
  Place `async-foundations` after `memory-ordering`.
- Teach four lessons and concepts: `future-laziness` after `loom-evidence`,
  then `await-progress`, `future-ownership`, and `future-cancellation`.
  Each has two distinct coding tasks, one without starter code, and a coding
  review. Each task has its own contract.
- Distinguish creating an async future from evaluating arguments, await from
  spawn, and Pending from blocking. Ready ends polling under the contract.
  An async move transfers values immediately, including before the first
  poll, and leaves reference lifetimes unchanged. Dropping a future stops
  further polling of it. Effects already executed persist, and separately
  spawned work can continue.
- Use safe pinning and the current Context/Waker. Manually poll only ready or
  explicitly controlled futures. Avoid a spin loop, sleep, and unsafe.
  Controlled Pending states must describe the wake-up path. Test the supplied
  Waker when it is part of the contract.
- Root owns course.ts registration, the distinct-gate test, E2E for the added
  module, and the README, audit, map, and verification updates. Preserve IDs
  and the state schema.
- The independent agent researches Tokio support in the runner and the
  trusted Cargo verifier from public sources. Keep examples local.
  `docs/superpowers/plans/2026-09-12-tokio-integration-research.md`

## Verification

- [x] Show the test for module presence and four independent criteria failing
  before registration and passing afterward.
- [x] Check trusted examples, correct solutions, and incomplete starters.
  Review the APIs, contracts, and ownership transfer separately.
- [x] Observe that the body has no effects before poll. Check propagation of
  Pending, await order, ownership, Drop, and preserved effects after cancellation.
- [x] Check purposeful errors: an eager effect, omitted await, ignored second
  future or error, lost ownership, and an incorrect cancellation claim.
- [x] Run lint, typecheck, Vitest, content validation, rustc, the HTTP source
  check, and the production build.
- [x] Check runnable predictions, blank-editor tasks, solution reveal with an
  independent alternative, resume, mobile layout, and offline access to the
  new module and existing packages.
- [x] Review the checkpoint and record results and remaining work.
- [x] Commit f2b052c, push, and merge the first PR as 64667e4. Both GitHub CI
  runs passed.

## Corrections after review

The initial gate variants were too similar. Tests counted characters instead
of observing the lifetime of the acquired resource. The revised tests use an
external DropProbe, verify the current Waker, and distinguish factory, queue,
sequence, ownership, and cancellation contracts. The blank-editor task describes
the required API in prose without supplying a signature or solution steps.

A controlled future that returns Pending before readiness either calls wake or
stores the current Waker for the test to trigger. `std::future::pending()`
explicitly models a future that never becomes ready. Its test needs no simulated
readiness event. The tests exercise individual polls without an executor loop.

The second independent review (GPT-5.6-Terra xHigh) found unnecessary static
bounds in defer_factory. The new test borrows a local String and returns &str.
It first produced E0373, then passed after both bounds were removed.
