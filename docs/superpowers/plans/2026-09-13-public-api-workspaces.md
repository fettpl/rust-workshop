# Public API and Cargo workspace implementation plan

[Polski](2026-09-13-public-api-workspaces.pl.md)

> **For agentic workers:** Use independent authors and reviewers, following subagent-driven-development and test-first verification of actual contracts.

**Goal:** Teach evolving a public Rust API without accidentally invalidating clients, and exercise the contract in a real, downloadable Cargo workspace. This advances the full approved curriculum; it does not complete advanced Cargo, public API design or the senior scope.

**Architecture:** One data-driven `public-api-workspaces` module after `tokio-network-service`, four lessons, four concepts, eight independent gates and four fresh coding reviews. A std-only `frame-protocol-workspace` package has a library and a separate client, real feature builds, external consumer tests, documentation and an explicit MSRV policy. Existing code-only runner and local-first state remain unchanged. Manifest/build checks run only on reviewed authored artifacts; do not infer workspace execution from inline browser Rust.

**Tech stack:** Existing Next.js/TypeScript course, Rust 2024, std-only Cargo workspace, resolver 3, supported compiler floor Rust 1.85.0 verified using that toolchain as well as stable.

**Spec:** Approved full course objective and `docs/advanced-curriculum.md`, sections Library API, Cargo, error design and independent mastery.

## Constraints and decisions

- Preserve lesson IDs and saved state. Audience knows basic programming and starts Rust from zero; no language bridge.
- Four lesson IDs: `api-validated-construction`, `api-error-source-chain`, `api-trait-compatibility`, `api-compatible-surface`. Concept IDs match lesson IDs. Steps use `<lesson>-gate` and `<lesson>-blank`; reviews use `review-<concept>`.
- First lesson/concept follows `tokio-admission-lifecycle` / `tokio-admission-permit-lifetime`, then chain the four new lessons/concepts. Earlier Cargo, error, trait and testing foundations can be referenced explicitly.
- Every blank is an independent new contract with no starter. A package reveal affects only four primary gates, not blanks or review. Downloading or running Cargo locally grants no mastery.
- Inline code teaches language/API contracts. The downloadable workspace supplies actual crate boundaries, rustdoc, features, metadata and compiler-floor checks. Detailed interactive manifest editing and complete release operations remain later scope; do not mark them mastered from single-file exercises.
- Prefer private representation, fallible validation, preserved error causes, stable old call sites, external implementers and dyn consumers. Compile success alone does not prove behavioral compatibility or complete SemVer compatibility.
- Features are additive; no security behavior is switched off. Verify default, no-default and all-features separately. A workspace passing with unified features must not conceal a failing library-only configuration.
- `rust-version` is a promise to verify, not evidence by itself. Do not label MSRV verified unless the exact older compiler executes the relevant artifact checks. Publishing is not part of this action.
- Execute only reviewed repository code locally. Never learner drafts or imports. No external runner POST.

## 1. Value and error contracts

Owner: `src/content/public-api-values.ts`.
Exports: `publicApiValueLessons`, `publicApiValueConcepts`, `publicApiValueCompetencies`, `publicApiValueSources`, `publicApiValueReviewExercises`.

- [x] Build two lessons: validated opaque values with fallible conversions and stable accessors; public errors with context and a preserved original `Error::source`.
- [x] Cover valid boundaries, invalid values, UTF-8 where applicable, ownership and reusable inputs. Prove source identity/type/kind rather than parsing display text; distinguish Display from a machine-readable contract.
- [x] Start with prediction and executable contrast, then a guided repair, new blank task and a fresh review. Test reference solutions and deliberate mutants that lose validation or cause information.
- [x] Verify all authored snippets with existing Rust verifier and independent review; record limits of same-crate privacy tests.

## 2. API evolution contracts

Owner: `src/content/public-api-evolution.ts`.
Exports: `publicApiEvolutionLessons`, `publicApiEvolutionConcepts`, `publicApiEvolutionCompetencies`, `publicApiEvolutionSources`, `publicApiEvolutionReviewExercises`.

- [x] Build two lessons: evolve a trait while preserving old implementers and dyn consumers; preserve an old public callable surface while changing private implementation and adding API.
- [x] Use actual external-style consumers, non-Clone/non-Debug test types, exact function pointer compatibility where relevant and tests for old behavior. Explain that a default trait method can still be a possibly-breaking change and `Self: Sized` methods cannot be called on a dyn receiver.
- [x] Prove both success of existing clients and failure of mutants that add a required method, destroy dyn compatibility, tighten bounds, remove old paths or change old semantics. Do not equate a passing fixture with universal semver proof.
- [x] Add independent blank and review domains; verify snippets and source contracts with an independent reviewer.

## 3. Executable workspace project

Owner: `src/content/projects/frame-protocol.ts` and focused files under `src/content/projects/frame-protocol/` if needed.
Exports: `frameProtocolPackage`, `frameProtocolProject`. Package ID `frame-protocol-workspace`; project ID `frame-protocol`.

- [x] Create a virtual workspace with `frame-protocol` library and `frame-probe` client, resolver 3, inherited edition/rust-version, fixed Cargo.lock and no registry dependencies. Each member explicitly opts into inherited metadata.
- [x] Library provides bounded u16 framing through an opaque validated value, structured public errors preserving original I/O source, public re-exports and an extension trait that supports an existing implementer and dyn use. Keep a documented original callable API alongside an additive API; test both.
- [x] Deliver a compiling incomplete starter with tests failing at deliberate todo! behavior and a complete reference. External integration tests and compile-fail doctests prove actual crate privacy and non-exhaustive behavior. Make expected-failure examples fail for the intended reason.
- [x] Include additive `diagnostics` feature, default/no-default/all-feature behavior, separate client process tests and library-only builds so feature unification cannot conceal a broken configuration.
- [x] Include README, CHANGELOG, ADR, local validation commands and a finite CLI demo. Document wire format, errors, contracts, feature policy, MSRV and scoped compatibility evidence; no actual publication.
- [x] Test exact limits, empty payload/EOF, truncation, I/O error identity, allocation-before-limit source order, public consumers, old function signatures and unchanged old behavior. Independently mutate reference contracts and ensure assertions or exact compiler diagnostics reject them.

## 4. Integration and executable checks

Root: module/course registration, `src/content/public-api-integration.test.ts`, package verifier/matrix script and focused tests, E2E/offline, CI and docs.

- [x] Add a failing integration test for the module chain, four independent gate pairs and package reveal, then register arrays/module/project and verify it passes. Reuse established evidence engine; do not add custom mastery exceptions. Red missing registration and green full Vitest observed; final frozen suite has 158 tests and author revisions were independently reviewed.
- [x] Verify the real workspace via Cargo metadata/tree, fmt, all-target check, test, doc and Clippy. Explicitly test library default/no-default/diagnostics plus workspace feature combinations. Verify exact MSRV using an isolated toolchain and CI job scoped to this package.
- [x] Test metadata/matrix verification failures by changing actual authored manifests or source; reject missing workspace member, wrong compiler floor, hidden default feature dependency and broken old consumer.
- [x] Run full content, typecheck/lint/Vitest/Rust/Cargo checks; source audit, production build, full E2E and offline ZIP byte checks. Freeze content before final build.
- [x] Independent review of both lesson groups, workspace and integration. Audit against original requirements and update honest coverage and limitations.
- [x] Commit/push and inspect exact-commit CI. Commit `89a388e687a50a6c51616b6a44d699d31ccb9467`, branch `feat/public-api-workspaces`; run `34743788852` passed both verify and workspace-msrv jobs (158 Vitest, 1251 Rust, 252 Tokio, 42 E2E).
