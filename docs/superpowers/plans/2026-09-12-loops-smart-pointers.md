# Loops and smart pointers — implementation plan

[Polski](2026-09-12-loops-smart-pointers.pl.md)

Complete the coverage of loop control flow and teach ownership and sharing through `Box`, `Deref`, `Drop`, `Rc`, `RefCell`, and `Weak` in nine lessons.

Three content modules use existing evaluators, retrieval practice, and v3 persistence. Loops follow Rust foundations. The two smart pointer modules follow Log Analyzer. Existing IDs and progress stay intact. Threads, `Arc`/`Mutex`, atomics, and async follow in a separate stage.

This stage follows the original brief, the amended learner profile of basic programming and no Rust experience, and parts 2 and 15 of `docs/advanced-curriculum.md`. The user approved incremental development of the whole course and a commit after each major stage.

## Contracts and ownership

1. `src/content/loops.ts` exports `loopsLessons`, `loopsConcepts`, `loopsCompetencies`, `loopsSources`, `loopsReviewExercises`, and `loopsModule`. Module `loops-control` requires `rust-foundations`. Lessons are `while-progress` (after `foundations-assessment`), `loop-values`, and `loop-control`. Concepts reuse the lesson IDs and the first follows `control-flow`. Use numbers and simple functions, and leave collections, closures, and pointers for after their introduction. Each starter terminates. State the bounds and maximum range of computations. Predictions distinguish `break`, `continue`, labels, and values returned by `loop`. Behavior tests verify behavior, with syntax beyond their scope.
2. `src/content/boxed-values.ts` follows the same export pattern using `boxedValues`. Module `boxed-values` requires `log-analyzer`. Lessons are `box-recursive` (after `log-analyzer-project`), `deref-contracts`, and `drop-resources`. Concepts reuse the IDs and the first follows `log-deterministic-report`. Teach Box as an owner, then E0072 and recursive structures. Teach Deref/Target and borrowing without copying, then Drop, explicit early release with `std::mem::drop`, and E0040. Introduce Rc/RefCell later. Box need not allocate for a ZST, and the handle has no guaranteed stack location. Limit the depth of recursive examples.
3. `src/content/shared-ownership.ts` uses the `sharedOwnership` export prefix. Module `shared-ownership` requires `boxed-values`. Lessons are `rc-sharing` (after `drop-resources`), `refcell-borrows`, and `weak-links`. Concepts reuse the IDs and the first follows `drop-resources`. Cloning Rc shares the allocation. Cover RefCell guards and explicit rejection via try_borrow_mut, and use Weak for the parent and Rc for the children. Weak lets the value drop and upgrade can return None. Test identity, counts, visible mutations, and release. Keep durable leaking cycles out of the fixtures. Rc is for single-threaded use.
4. The lead integrates data in `src/content/course.ts` and updates the roadmap and criteria integration test. Each new criterion has at least two independently tested alternatives. Revealing the first does not complete the module and the second stays available for an unaided attempt. Add a browser test for Resume, diagnostics, and preservation of saved progress under the new module order.

## Tasks

- [x] Each author supplies three lessons with prediction, execution and interpretation, repair, transfer, and retrieval practice. Each module has an independent task without a starter. Examples, hints, APIs, and tests follow the same contract.
- [x] Local `verifyTrustedRust` checks only authored fixtures for correct solutions, rejected starters, expected diagnostics, and nonempty test sets. Test meaningful faulty variants, including copying in place of cloning Rc and a strong parent link in place of Weak.
- [x] Preserve existing IDs and persisted progress. Test how assistance affects fresh alternatives. Map loops after foundations and the pointer modules after the previous last module.
- [x] Independently review contracts, data scope, sources, and hint quality. The lead corrects discrepancies and checks the evidence behind author reports.
- [x] Run lint, types, Vitest, content validation, Rust, build, and source checks. Check browser Resume, mobile, keyboard use, and offline behavior. External Playground checks still require approval.
- [x] Update README, the requirements audit, the curriculum map, the current status, and the verification report. Commit the actual stage locally.

## Completion boundaries

The stage completes loop syntax and single-threaded ownership with smart pointers. Part 15 still includes Arc/Mutex, and the course remains in progress. The delivered material and local tests are available. A pilot with learners and human assessment of professional work remain outstanding.

## Outcome

The `trace-rc-weak` trace distinguishes the lifetimes of the value and the allocation and shows explicit Rc/Weak handles. The new optional model fields preserve learner state. Verification covered 102 Vitest tests, 25 E2E scenarios, 943 authored Rust cases, and eight rejected faulty variants. External Playground verification remained outside this run after an earlier automated approval denial. Full results are in `docs/verification.md`.
