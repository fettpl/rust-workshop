# Atomics, memory ordering, and Loom models — plan

[Polski](2026-09-12-atomics-models.pl.md)

Extend the approved curriculum with atomic operations and checks of small concurrent protocols. Keep independent exercises and retrieval practice, and state what the tests establish.

Two content modules follow synchronized-state. The existing project view provides a separate Cargo lab. One implementation of each algorithm uses an std/Loom import layer controlled by the `model` feature. The browser still runs single programs using std. Loom runs in the downloaded package and during development verification of trusted artifacts.

The stage follows the original brief, the accepted profile of a learner starting with no Rust, part 16 of `docs/advanced-curriculum.md`, and the active development goal for advanced practice. The user approved continuation and a commit after the major stage.

## Contracts and division of work

- `src/content/atomic-state.ts` defines the atomic-state module after synchronized-state. Lessons and concepts are atomic-rmw (after mutex-recovery), atomic-cas, and atomic-limits. Exports are atomicStateLessons/Concepts/Competencies/Sources/ReviewExercises/Module. Cover read-modify-write, the previous value and wrapping, CAS and retries, the limits of atomicity, and ABA.
- `src/content/memory-ordering.ts` defines the memory-ordering module after atomic-state. Lessons and concepts are release-acquire (after atomic-limits), ordering-contracts, and loom-evidence. Use the memoryOrdering export prefix. Cover publication, permitted orderings, and the limits of model evidence. Adapter tests verify adapter behavior.
- Each module contains three concepts, six independent coding assessments, three empty-editor tasks with precise contracts and no supplied signature, and three retrieval exercises. Prediction questions show a concrete program or scenario. Scheduler order and performance are outside the evidence.
- The lead implements the concurrency-lab lab with the concurrency-lab-workshop package. Use an std/Loom alias, bounded reservation by CAS, and one-time publication with a consumed, non-cloneable Publisher and a Subscriber. Provide std tests, models, and deliberate counterexamples. The model limits the number of threads to three and avoids unsafe code and unbounded waits. Pin dependencies with `Cargo.lock` and Loom 0.7.2, and explain modeling limitations.
- The lead integrates course.ts, assessment gates, reveal, archives, and Cargo verification in CI. Verify the build, offline mode, and project regressions. Keep v3 state and existing IDs.

## Verification criteria

- [x] Start with a failing integration test for the new package, its relationships, help disclosure, and fresh alternatives.
- [x] Authors verify their trusted Rust 2024 fixtures. The lead reviews contracts and tests.
- [x] Standard tests and models run the same library code. Both correct models pass. The deliberate load/store and Relaxed publication variants fail specific assertions. Timeout and compilation errors are excluded as evidence of rejection.
- [x] Disable the permutation, time, and preemption caps explicitly. Treat hitting the step limit as an error. Document the limits of Loom's coverage of Relaxed behavior.
- [x] Run check/test/fmt/clippy for the package and the model variants. Starters require implementation. Fetch pinned dependencies once, then run `--offline --locked`.
- [x] Check lint, types, Vitest, content validation, rustc, source availability, build, E2E, mobile, keyboard use, and offline mode.
- [x] Conduct an independent review, test faulty solutions, correct the findings, update the audit and results, and commit locally.

Local rustc runs are limited to authored cases. An external Playground run requires separate approval. The roadmap still includes async, advanced Cargo/API work, HRTB and variance, property testing and fuzzing, performance, unsafe/FFI, and the full portfolio.

## Review outcome

Tests were strengthened after finding a load/store workaround, a variant that ignored observed, and publication without an observable protocol. The assessment gates distinguish RMW from flags, transactions from versions, and publication from acknowledgment. The rules for 15 valid CAS ordering pairs were updated against the current std and rustc. Full compilation exposed an Option issue in a starter, which was fixed. The final check passed 74/74 cases across both modules. Review covered eight faulty solutions and a real model of a weakened implementation. Details and limits are in `docs/verification.md`.
