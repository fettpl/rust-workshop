# Cargo and I/O — stage plan

[Polski](2026-09-12-cargo-and-io.pl.md)

The goal is to progress from a single program and the Todo core to a public API, a Cargo package, and tested input handling, a data format, and persistent storage.

The runner continues to execute code in an isolated Playground. Module lessons use real inline modules. The full Cargo package is a separate download with explicit file paths, exercise instructions, and tests. The application keeps system commands and learner drafts off the host. Downloading the package earns no mastery credit. The persistence schema stays at v3.

- [x] Four active lessons on modules, visibility, imports, and Cargo, with code tests, retrieval practice, and independent criteria.
- [x] Three active lessons leading to the Todo data format, I/O error handling, and a complete CLI project. Define the contracts before implementation.
- [x] Package name, files, instructions, starter, and clearly marked solution. Build the downloadable ZIP from the files checked by Cargo during development.
- [x] File browser and download on the project page, accessible by keyboard and on mobile. Reveal the solution separately.
- [x] Check paths, uniqueness, and required package files. Keep notes and learner drafts out of the authored archive.
- [x] Run domain and UI tests, check all authored Rust snippets, run Cargo check/test/fmt/clippy for the package, smoke-test the isolated runner, and verify the production build offline.
- [x] Conduct an independent review, make corrections, update the requirements audit, build for production, and commit the completed stage.

The remaining scope includes generics, traits, lifetimes, iterators, extended testing, smart pointers, concurrency, async, projects that revisit earlier skills, and advanced systems practice. Independent work still requires assessment and a pilot with learners.

Verification covered 86 Vitest tests, 400 authored Rust cases, 16 end-to-end scenarios, 19 Cargo package tests, seven live API checks, and the production build offline. See the full results and their limits. [Verification report](../../verification.md)
