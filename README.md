# Rust Workshop

**Make Rust click—one prediction, compiler message, and working program at a time.**

Rust Workshop is an interactive course for people who know basic programming and are starting Rust from zero. It brings explanations, a code editor, executable exercises, ownership visualizations, spaced review, and downloadable Cargo projects into one learning workspace.

Start with a small question: *Who owns this value? What will this program print? Why does the compiler reject it?* Then test your reasoning, repair the code, and apply the idea in a fresh task. The course grows from first Rust programs to borrowed APIs, concurrency, async services, testing, and unsafe contracts.

**Language:** lessons and the learner interface are currently in Polish. This README and contributor instructions are in English.

## Learn by making decisions

Each part of the learning loop has a job:

1. **Predict** output, ownership, or a compiler error before running code.
2. **Experiment** in the editor and read the compiler's actual feedback.
3. **Repair** a broken program and explain the contract behind the fix.
4. **Transfer** the idea to a new problem, including tasks with an empty editor.
5. **Return** to a spaced review queue and retrieve the idea after time away.
6. **Build** a Cargo project that connects individual concepts into a working program.

Hints and reference solutions support learning. The progress model tracks assistance and distinguishes reading, completion, coding evidence, and later recall, so opening a lesson or revealing an answer does not count as independent coding success.

## A workspace that remembers your work

- **See ownership unfold.** Step through visual traces of owners, borrows, stack/heap relationships, and value lifetimes.
- **Work with executable feedback.** Run Rust and exercise tests, inspect diagnostics, and navigate back to the relevant code.
- **Follow the concept graph.** Explore prerequisites, concept-level evidence, module criteria, and reviews due next.
- **Pick up where you stopped.** Keep your lesson position, editor drafts, notes, bookmarks, and review history in the browser.
- **Take your progress with you.** Export and import a validated learning-state file; download starter and solution project archives.
- **Make room to concentrate.** Use focus mode, keyboard navigation, a responsive mobile layout, and light or dark themes.
- **Keep studying offline.** The production app caches learning materials and supports saved drafts after an initial online visit. Rust execution requires a reachable runner.

Learning state is stored locally in IndexedDB, with no account required. Export a backup before clearing browser data or switching devices. Running an exercise sends its code to the configured remote runner; the default is the official Rust Playground. See the [runner boundary](docs/runner.md) for the execution and privacy details.

## A path from first programs to deeper Rust

The course map separates a beginner core from optional extensions, so advanced material stays discoverable without crowding the starting path.

| Path | What you work on |
| --- | --- |
| First Rust programs | Bindings, functions, control flow, ownership and borrowing, structs and enums, collections, and error handling |
| Everyday Rust | Modules and Cargo, generics and traits, lifetimes, closures, iterator pipelines, conversions, and documentation-guided repair |
| Projects that connect the basics | Todo CLI, Number Guessing+, Log Analyzer, Mini grep, and a learner-owned Study Session CLI assignment |
| Ownership and abstraction | Smart pointers, shared ownership, variance, higher-ranked callbacks, generic associated types, and lending APIs |
| Concurrency and services | Threads, channels, synchronized state, atomics, Futures, Tokio tasks and I/O, cancellation, bounded flow, and a Durable Log Service capstone |
| Libraries and engineering practice | Workspaces, public API compatibility, dependency policy, macros, property testing, fuzz evidence, performance and allocation evidence, FFI, and Miri safety contracts |

The beginner core runs through Log Analyzer. Mini grep, smart pointers, and threaded programs extend that foundation before the Study Session CLI assignment; the service capstone and other specializations are optional. Project archives let you continue with Cargo outside the browser.

See the [curriculum and roadmap](docs/advanced-curriculum.md) for scope and remaining work. Advanced exercises focus on specific, executable contracts, with scope and remaining work documented alongside the curriculum.

## Run locally

Use **Node.js 22.13 or later in the 22.x line, or Node.js 24+**, and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000). The development and build commands generate the downloadable project assets automatically. You do not need a local Rust toolchain to use browser exercises; their remote execution needs internet access.

To use the production build, including the service worker for offline study:

```sh
npm run build
npm start
```

There is no hosted demo configured in this repository. Local Rust toolchains are needed for downloaded Cargo projects and maintainer verification, rather than for serving the learning app.

## Develop and contribute

Rust Workshop uses Next.js, React, TypeScript, Monaco, IndexedDB, and a data-driven course model. Start with [AGENTS.md](AGENTS.md) for repository conventions and the installed Next.js documentation requirement.

| Area | Where to look |
| --- | --- |
| Lessons, concepts, reviews, sources, and projects | `src/content/`; assembled in `src/content/course.ts` |
| Content and state contracts | `src/domain/types.ts` |
| Evaluation, progression, review, and course routes | `src/engine/` |
| Saved state, migrations, and import/export | `src/persistence/` |
| Learner interface | `src/components/` |
| Remote execution adapter and API boundary | `src/runner/`, `src/app/api/run/` |
| Trusted Rust verification and browser scenarios | `scripts/`, `tests/e2e/` |

Useful starting points are clearer explanations, new repair/transfer variants, accessibility improvements, project tests, source-reference maintenance, and beginner learner feedback. Keep learner-facing content in Polish and new contributor documentation, commits, and pull requests in English. Preserve existing content IDs and saved progress when extending the course.

For the JavaScript and content checks:

```sh
npm run typecheck
npm run lint
npm run content:check
```

The full test suite also uses trusted Rust fixtures. Prepare the toolchains and fixed Cargo dependencies described in [CI and local verification](docs/ci-cd.md) before running `npm test`. The initialized-prefix native-proof test is skipped by default locally; [CI explicitly authorizes it and prepares its offline configuration and toolchain qualification](.github/workflows/ci.yml), then awaits the real native proof. Other trusted Rust tests still run locally. The CI guide also covers production browser/offline checks and the specialized `content:*` verifiers. Browser tests that intercept runner responses establish UI and saved-state behavior; real compiler and runtime checks establish Rust behavior separately.

## Project status

The learning app and its curriculum are implemented and continue to evolve. Current work includes deeper independent practice, advanced contract exercises, and learner validation. Human pilot evidence is still needed to evaluate learning effectiveness; software checks alone do not establish it.

The [implementation record](docs/progress.md), [curriculum roadmap](docs/advanced-curriculum.md), and [verification record](docs/verification.md) retain detailed scope, dated results, and open work. Some existing project documentation is in Polish.

The repository is being prepared for public release. No project license file is currently included.
