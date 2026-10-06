# API Release Matrix milestone plan

**Goal:** Teach a senior-level release decision for a Rust library through an old external client, feature configurations, and an exact MSRV promise. This continues the approved advanced curriculum without changing the beginner audience: basic programming knowledge, Rust from zero.

**Architecture:** Add one late-course module after `public-api-workspaces`, with two Polish lessons and independent gate/blank/review evidence per concept. Browser tasks assess code and reasoning on bounded Rust contracts. A separate trusted verifier exercises a tiny authored Cargo library plus an external client on stable and Rust 1.85.0; browser mocks must never be presented as actual Cargo evidence. Keep Frame Protocol's existing package and public IDs stable.

**Existing patterns:** `src/content/public-api-module.ts`, `public-api-evolution.ts`, `public-api-integration.test.ts`, `src/content/cargo-dependencies.ts`, `scripts/verify-workspace.ts`, `scripts/verify-async-lending.ts`, `src/content/course.ts`, `tests/e2e/unsafe-borrowed-memory.spec.ts`. Before code changes, read the relevant `node_modules/next/dist/docs/` guide per AGENTS.md. Use TDD and current content schema; no new dependency or live registry access.

## Task 1 — Real old-client release contract

- Add a small std-only authored Cargo fixture/verifier under `scripts/` for a `release_probe` library and distinct `old_consumer` crate. Run `cargo check/test --offline --locked` on stable and exact 1.85.0. The old client must continue to import a public path, implement a public trait, and call through `&dyn Trait` after the candidate change. Check default and `--no-default-features`, plus one opt-in feature; a workspace-only all-features pass is insufficient.
- The candidate adds an optional capability without imposing a new method or bound on the old implementer. A positive source and at least four controlled mutants must be tested: removed/renamed old path, required trait method or lost `dyn` compatibility, a default/no-default feature regression, and a compiling candidate with changed old-client behavior rejected by `cargo test`. Treat a compiler timeout/toolchain absence as infrastructure, not product success. Limit subprocesses and record exact toolchains, commands, exit status and fixture hashes in a JSON report.
- Test the verifier's report validation and mutant rejection. `npm run content:api-release -- --stable` and `--msrv` must be available and wired into CI before generic archive checks; no external network or registry publication. A local `cargo package --list` can be used to examine file inclusion, but no `cargo publish`.

## Task 2 — Learner module

- Add two Polish lessons in a new late-course module: (1) interpret a single old-client observation as compiler break, behavioral regression, or infrastructure/unknown; (2) investigate provenance-bearing feature/MSRV records before approving release. Existing `public-api-evolution.ts` already teaches preserving old paths and traits, so the new gate must classify evidence rather than repeat its `classic::show` or `Meter` task. Each lesson needs predict/run-or-observe/explain/modify/debug/review flow, one primary code-evaluated gate, a distinct blank-page alternative, and delayed code retrieval. Use fresh domains rather than copying the fixture's names/data.
- Code marked correct must compile; incorrect examples must fail for the named reason. Browser code tasks are single-source Rust and should not pretend to prove `Cargo.toml`, feature resolution, or an external crate boundary. Explain that the trusted verifier supplies those separate proofs.
- Register the module, concepts, competencies, sources, reviews and roadmap in `src/content/course.ts`; keep all existing IDs and progress migrations unchanged. Add module gate criteria as separate OR pairs (`gate` or `blank`), not one criterion combining all tasks. Connect the module to Frame Protocol in its module contract without changing its existing archive bytes or project completion semantics.
- Tests must prove: hidden tests reject a trivial stub and a breaking mutant; a solution passes; reveal of the primary task does not pass the module gate while an unrevealed blank can; source/lesson/graph validation passes.

## Task 3 — End-to-end and documentation

- Add focused Playwright production and offline checks for navigation, gate evidence, reveal weakening, independent blank, exact resume, notes, keyboard and console errors using the existing mocked runner contract. Ensure mock success depends on the actual authored code; an unexpected source gets schema-valid `test-failure`.
- Update `docs/advanced-curriculum.md`, `docs/requirements-audit.md`, `docs/progress.md`, and `docs/verification.md` with exact counts, local evidence and remaining limits. Keep README English, code/commit/PR text English, learner copy Polish, and no Java/Python prerequisite framing.
- Validate focused tests, full Vitest, typecheck, content check/audit, lint, build, stable/MSRV fixture verifier, targeted E2E and full offline. Check formatting and diff; commit an English milestone and push a reviewable PR. CI billing remains a separate external gate: never call the new release workflow green without an exact-head job result.

## Review focus

1. An old client using the pre-existing public import path must compile unchanged; a compiler break is distinct from infrastructure failure.
2. An old implementation and old `&dyn` consumer must remain valid with the candidate trait; a compiling behavioral regression must still block release.
3. Default/no-default/opt-in feature configurations must each be checked from the external client's perspective.
4. The declared MSRV must be exercised with exact 1.85.0, not inferred from stable.
5. Revealed or mocked browser evidence must not count as independent mastery or real Cargo release evidence.
