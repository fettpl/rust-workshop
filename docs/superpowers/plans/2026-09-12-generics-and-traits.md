# Generics and traits — stage plan

[Polski](2026-09-12-generics-and-traits.pl.md)

Teach learners to design APIs that work with different types and avoid unnecessary bounds and copies. The advanced curriculum still includes lifetimes, iterators, and further professional practice.

The architecture stays data-driven. The new generics.ts and traits.ts files export lessons, modules, concepts, competencies, retrieval exercises, and sources. Integration in course.ts retains existing IDs and schemaVersion 3. Learner Rust code continues to run in the external sandbox.

- [x] Three generics lessons cover type parameters, methods and ownership, and the minimum bounds implied by the operations.
- [x] Four trait lessons cover contracts and implementations, generic consumers, associated types, and dispatch and dyn compatibility.
- [x] Give each concept active retrieval practice, observable evidence, and a second coding variant with a changed contract. Empty-editor tasks require an independent implementation.
- [x] Test different types, including types without Copy/Clone, and define new trait implementations in the tests. Match compiler messages to the actual errors.
- [x] Check starters for code that already meets the stated criteria and remove false evidence of independent work.
- [x] Integrate the map and sources, check UI regressions, verify that Resume opens the correct new lesson, and test help reveal and a fresh transfer task.
- [x] Conduct an independent review. Verify all Rust cases, app tests, current sources, the live API, the production build offline, and the build itself.
- [x] Update the requirements audit and project status, then prepare the verified stage for commit.

Technical tests verify specific behavior. Assessing independent professional work and learning effectiveness requires a pilot.

Verification covered 89 Vitest tests, 573 authored Rust cases, 17 end-to-end scenarios, the Cargo package, 74 reachable sources, nine live API checks, and the production build offline. Review reduced over-detailed hints, required learners to define associated types independently, and improved navigation to the exercise. [Verification report](../../verification.md)
