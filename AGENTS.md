# Repository guidance

## Product and language

- Rust Workshop teaches people with basic programming knowledge and zero Rust experience. Explain Rust concepts from first principles; do not assume knowledge of another language's libraries.
- Keep learner-facing lessons, prompts, feedback, and interface copy in Polish. Write new contributor documentation, commits, and pull requests in English.
- Present the product as a local-first learning workspace. Do not invent accounts, cloud sync, hosting, educational efficacy, professional readiness, or an automatic whole-architecture assessment.
- Keep the README focused on the learner value, setup, and contribution path. Put dated verification details and limitations in the relevant maintained docs.

## Agent coordination

- Use GPT-5.6-Luna with high reasoning for all subagents, following the latest explicit user instruction. Do not silently substitute models; report unavailability. An explicit later user instruction takes precedence.
- Prefer parallel agents for independent tasks. Give each agent a clear scope and avoid overlapping edits; keep dependent tasks sequential.
- Keep patches focused and reviewable. Follow applicable repository instructions and the user's current scope; do not introduce unrelated process or approval gates.
- Keep resume notes and handoff state in a persistent, ignored workspace directory, such as `test-results/handoff/`. Temporary directories may disappear between sessions; never use them as the only copy of work needed to resume. Keep committed documentation portable and free of private receipts.

## Architecture and compatibility

- `src/content/course.ts` assembles data-driven lessons, modules, concepts, sources, reviews, and projects from `src/content/`. Follow the types in `src/domain/types.ts` and existing content patterns.
- `src/engine/` owns evaluation, learning evidence, reviews, and navigation. Keep these rules separate from UI components.
- `src/persistence/` owns IndexedDB storage, state validation, migration, and import/export. Preserve old state and test backward compatibility when changing it.
- Treat lesson, module, concept, review, task-family, and source IDs as persistent contracts. Preserve existing step identities and historical ordering; introduce explicit migration or compatibility handling when a change requires it.
- Preserve exact resume, drafts, notes, bookmarks, raw evidence history, assistance history, review sessions, and imports. Do not rewrite old events to manufacture new evidence.
- Distinguish exposure, completion, independent coding evidence, and delayed retrieval. A reveal, assisted submission, alias, repeated task, or mocked runner response must not create independent coding credit.
- Maintain official source references and reviewed metadata with content changes. Validate examples and evaluator contracts against the supported Rust toolchains; a documentation link alone is not executable proof.

## Execution boundary

- Learner Rust runs through `POST /api/run` and the isolated remote runner adapter. Never execute untrusted learner code, imported code, or arbitrary learner manifests with local `rustc`, Cargo, a shell, or child processes.
- Local Rust verifiers are maintainer tools for fixed, repository-authored trusted fixtures. Keep that boundary intact; never route app requests or imported state into those commands.
- Runner unavailability is infrastructure feedback, not a wrong learner answer. Offline study must preserve state and explain that Rust execution is unavailable.
- See [docs/runner.md](docs/runner.md) for adapter contracts and limits. Intercepted browser responses prove request/UI/state behavior; distinguish them from actual compiler, runtime, archive, and native-tool evidence in reports.

## Setup and verification

- Use the Node.js versions declared in `package.json` and install with `npm ci`. `npm run dev` and `npm run build` regenerate project assets through their lifecycle scripts; do not hand-edit generated archives.
- Before Next.js changes, read the relevant installed guides specified in the managed block below.
- Run checks appropriate to the change: `npm run typecheck`, `npm run lint`, `npm run content:check`, and focused tests. For curriculum/evaluator changes, include real trusted Rust checks and applicable package verifiers, rather than relying on UI mocks.
- Full `npm test` includes native trusted-fixture work. Prepare stable Rust and the fixed Tokio dependency cache first, as documented in [docs/ci-cd.md](docs/ci-cd.md). Exact Rust 1.85.0 and specialized pinned tools are needed for their respective verification scopes.
- The initialized-prefix native-proof unit test skips locally unless `RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED=1`. Its CI setup in [.github/workflows/ci.yml](.github/workflows/ci.yml) prepares the offline Cargo configuration and stable toolchain qualification before authorizing and awaiting the full native proof. Do not bypass that qualification or turn missing inputs into a pass or skip in an authorized run; other trusted Rust tests remain active in ordinary local runs. The older CI guide does not describe this new profile.
- Production E2E and offline checks require a production server, Playwright Chromium, and permission to bind loopback ports. Follow [docs/ci-cd.md](docs/ci-cd.md); offline service-worker behavior is production-only.
- Native verifiers, builds, and browser suites can be resource intensive. Use available CPU/memory and tool prerequisites to choose concurrency; avoid overlapping expensive full runs without capacity. Report blocked, missing-tool, timeout, and partial runs accurately.
- Before a PR, obtain independent review and record fresh relevant verification. Before the next feature, confirm required checks are green on the exact PR head and resulting `main` commit; historical green runs are not evidence for a changed tree.
- Keep private receipts, temporary artifacts, credentials, and machine-specific paths out of commits. Use portable repository-relative commands and link durable project docs for reproducible instructions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
