# Rust Workshop

Rust Workshop is a local-first, interactive course for people who know the
basics of programming and are starting Rust from zero. Lessons and the learner
interface are currently in Polish; this README and the contributor
documentation are in English.

See the [history redaction notice](docs/history-redaction.md) for historical
presentation changes, frozen receipt hashes and current compatibility limits.

The course asks you to predict what a program will do, experiment with it,
read a real compiler diagnostic, repair the code, and transfer the idea to a
new task. Spaced review brings concepts back after time away, and project
work connects individual exercises into programs you can continue locally.

## What you can learn

The **core route** ends at Log Analyzer. It starts with the first Rust program,
control flow, ownership and borrowing, data modeling, collections, errors,
Cargo, generics, traits, lifetimes, closures, iterators, testing, Number
Guessing+, and Log Analyzer.

The course map also has optional extension groups. You can browse them without
changing the core route:

- **Language and abstraction:** boxed values, shared ownership, callbacks,
  GATs, and lending APIs.
- **Concurrency and services:** threads, channels, async, Tokio, networking,
  operations, and a capstone.
- **Libraries and APIs:** public contracts, workspaces, dependencies, release
  matrices, and macros.
- **Testing and safety:** Mini grep, property tests, fuzzing, profiling,
  allocation evidence, FFI, and Miri contracts.

The course currently includes project work for Todo CLI, Number Guessing+,
Log Analyzer, atomic protocols, Tokio pipelines and TCP services, service
operations, public API workspaces, Mini grep, property contracts, an FFI
buffer wrapper, Miri safety, and a durable log service. Project pages provide
starter and solution archives where a Cargo package exists. Downloading an
archive gives you files to work on locally; the web app does not run those
archives on your computer.

The workspace includes an ownership visualizer, progressive Compiler Coach
hints, focus mode, keyboard controls, and light and dark themes alongside its
lessons, projects, review history, and local export/import.

## A local learning workspace

- Progress, drafts, notes, bookmarks, review history, and evidence history are
  stored in your browser's IndexedDB. No account is required.
- Settings lets you export a validated progress file and import it later. Keep
  an export before clearing browser data or moving to another device.
- A production build registers a service worker and caches visited learning
  resources and project downloads. After an initial online visit, saved work
  and cached lessons can be opened offline.
- Rust execution is a separate boundary. Pressing **Run** sends the current
  editor code to `POST /api/run`, which forwards it to an isolated remote
  runner (the default is the official Rust Playground). The app does not run
  learner code, imported code, Cargo, or a shell locally. Offline study keeps
  your state, but a run needs a reachable runner; an unavailable runner is
  infrastructure feedback, not a wrong answer. See [the runner boundary](docs/runner.md).

This is a learning workspace, not an authenticated assessment service. Browser
state and imported evidence are local and are not proof of an external exam or
of a particular learning outcome.

## Run it locally

The supported Node engine is `^22.13.0 || >=24`. A Rust toolchain is not needed
to serve the web app or use its browser exercises.

From a clean checkout:

```sh
git clone https://github.com/fettpl/rustcrushcourse.git
cd rustcrushcourse
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. The development server generates project assets
through the normal npm lifecycle. For a production build and its offline
service-worker path:

```sh
npm run build
npm start -- --port 3002
```

With that production server running, the maintainer offline check is:

```sh
npm run test:offline
```

It needs Playwright and the loopback production server; it verifies the cached
offline path rather than making Rust execution local.

Rust is required when you unpack a Cargo project or run maintainer verification
against trusted repository fixtures. Those commands use fixed inputs and are
separate from the learner runner. Start with [CI and local verification](docs/ci-cd.md)
before attempting the full suite.

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, contribution types,
validation, pull requests, and contribution rights. The short [PR template](.github/pull_request_template.md)
helps reviewers identify learner-language, persistent-ID, evidence, and
validation changes.

The main source map is:

| Area | Location |
| --- | --- |
| Lessons, modules, concepts, reviews, sources, and projects | `src/content/`, assembled in `src/content/course.ts` |
| Domain and persistence contracts | `src/domain/`, `src/persistence/` |
| Evaluation, progression, and review | `src/engine/` |
| Learner interface | `src/components/` |
| Remote runner and API route | `src/runner/`, `src/app/api/run/` |
| Trusted fixtures, package generation, and verification | `scripts/`, `tests/`, `scripts/fixtures/` |

Useful first contributions include clearer Polish explanations, repair and
transfer exercises, source-reference maintenance, project tests, and focused
UI improvements. Preserve existing lesson, module, concept, review, project,
and source IDs: saved progress and imported state depend on them.

For quick application and content checks:

```sh
npm run typecheck
npm run lint
npm run content:check
```

`npm test` includes trusted native-fixture work. A fresh maintainer run needs
the stable Rust toolchain and the locked Tokio dependency cache described in
[CI and local verification](docs/ci-cd.md). The initialized-prefix native proof
also requires its explicit qualified profile; an ordinary local run skips that
proof unless `RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED=1` is set
after the documented offline setup. Do not treat a skipped or infrastructure-
limited check as a passing proof.

## Licensing status

The maintainer has approved this license split and the project credit
**Pixel Media Workshop Paweł Borawski** (2026). Public-release preparation and
source-provenance checks remain in progress. The licenses cover only rights
the project can grant:

- MIT for application code, scripts, tests, evaluator machinery, programming
  examples, executable lesson code/solutions, and code in downloadable
  project archives;
- CC BY 4.0 for authored teaching narrative, exercise prose, didactic answer
  text, explanations, and authored and approved original illustrations;
- the original license and attribution for third-party material.

Some TypeScript files contain both executable code and authored lesson text. In
those files, apply the split to the relevant portions rather than treating the
whole file as one blanket license. Preserve notices and attribution when
reusing a portion. Three existing authored Cargo package manifests retain a
narrow, maintainer-approved `MIT OR Apache-2.0` expression; this is not
a blanket license for the repository. See the current
[licensing guide](docs/licensing.md) for the canonical file-level, mixed-file,
and archive reference. This is not a choice between MIT and CC BY for the
whole repository. The icon assets remain an unresolved provenance gate until
their source and permissions are established.

The maintainer reports that the course prepared for this milestone was generated
with ChatGPT and Codex Desktop using GPT-5.6 and later models for drafting and
research, from the maintainer's prompts and direction, with no manual drafting
of course fragments. This describes the workflow, not proof of originality,
copyright protection or third-party clearance. The licensing guide explains
these limits and provides the approved attribution example.

The current release draft covers the source repository, authored Cargo
archives, and the published audit surface. It does not publish a hosted
deployment, compiled browser application, `.next` directory, or
`node_modules` tree.

See [SECURITY.md](SECURITY.md) for the current reporting limitations and the
required release gate. No private reporting route is claimed until verified.
Do not include secrets, private attachments, account or billing information,
or machine-specific paths in public issues and pull requests.

## Project notes

The [curriculum roadmap](docs/advanced-curriculum.md) describes the current
scope and remaining course work. [AGENTS.md](AGENTS.md) contains repository
operating rules, while [docs/runner.md](docs/runner.md) and
[docs/ci-cd.md](docs/ci-cd.md) hold the specialist execution and verification
details. The repository is being prepared for public release; local
preparation does not by itself change repository visibility, publish packages,
or deploy a hosted application.
