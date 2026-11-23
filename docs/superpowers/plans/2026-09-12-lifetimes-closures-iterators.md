# Lifetimes, closures, and iterators — stage plan

[Polski](2026-09-12-lifetimes-closures-iterators.pl.md)

The goal is to design safe data views, choose how to pass callbacks, and process collections with iterators. This stage covers the foundations of parts 12–13 of the original brief and prepares learners for Log Analyzer. The advanced scope and assessment of independent work remain open.

Three independently authored content files are integrated in the existing course.ts. They share evaluators, the concept graph, mastery tracking, and the v3 persistence schema. Only the isolated runner executes learner drafts. The stage needs no new dependencies.

Learners know basic programming and started the course without Rust. Use stable Rust, edition 2024. Start each lesson with a problem or prediction, and introduce lifetime rules after the error that motivates them. The first hint identifies the area and the second supplies the rule. The full fix appears in the solution. Each concept has active retrieval practice and two independent assessed variants. Compile only repository-authored fixtures locally.

- [x] src/content/lifetimes.ts covers relationships between inputs and results, structs that borrow, elision, and choosing owned or borrowed data. Include actual diagnostics and one empty-editor task. Tests verify where the view comes from and vary the scope of supporting data.
- [x] src/content/closures.ts covers captures, move, Fn/FnMut/FnOnce, and minimal callback contracts. Tests verify call order and count, mutation, and one-time consumption of data.
- [x] src/content/iterators.ts contains four lessons, with laziness introduced separately from pipeline composition. Cover borrowing and moving elements, laziness, pipelines, short-circuiting, and Iterator/IntoIterator. Test side effects, empty input, Unicode, boundaries, and exhaustion.
- [x] Integrate the content and roadmap. Tests verify that using help requires an independent attempt on a new variant. Review contracts for unnecessary stronger bounds and tasks that can pass without meaningful work.
- [x] Remove the first-answer bias in earlier modules with a stable order based on the question ID. Preserve answer IDs, Resume, and the order where it matters to the exercise.
- [x] Check real Rust behavior and the live API, current sources, end-to-end flows, Resume, and mobile. Inspect the UI, keyboard navigation, browser console, production offline mode, and build.
- [x] Review each part independently, make corrections, and update the requirements audit and verification report. Commit after verifying the stage.

Lifetimes describe the relationships Rust checks at compile time. They leave the runtime lifetime of data unchanged. Check compile-time properties with the compiler. Abstraction costs, variance, HRTB, and further professional topics require their own material and practice in projects.
