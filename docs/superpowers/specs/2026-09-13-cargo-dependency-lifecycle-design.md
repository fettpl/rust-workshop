# Cargo dependency lifecycle and manifest exercises

[Polski](2026-09-13-cargo-dependency-lifecycle-design.pl.md)

The course has a real two-member workspace but does not yet teach the full path from registry dependency declarations through feature selection and locked builds to an inspected crate archive. This milestone adds four lessons and extends the existing Frame Protocol project. It is part of the user's authorized continuous advanced-course goal. It does not complete the remaining unsafe, GAT, performance, production operations, capstone or learner-pilot requirements.

## Product and integration

- Module ID: `cargo-dependency-lifecycle`; title: `Cargo: zależności, features i pakowanie`.
- Register immediately after `public-api-workspaces`; module prerequisite `public-api-workspaces`.
- Ordered lesson/concept IDs: `cargo-dependency-contract`, `cargo-resolver-feature-unification`, `cargo-lock-msrv-policy`, `cargo-package-rehearsal`.
- First lesson/concept prerequisite `api-compatible-surface`; subsequent IDs form a chain.
- Each lesson teaches a distinct declaration contract, with prediction, concrete observation, explanation, a primary task, a fresh blank-page task and an independent retrieval exercise. Local Cargo procedures and interpretation are essential parts of the lesson, without pretending the application executed those procedures.
- Primary IDs are `${lessonId}-gate`, blank IDs `${lessonId}-blank`. Four module criteria each refer to that pair; separate retrieval exercises do not inflate module gate counts.
- Preserve all existing lesson, concept, project and archive identities and saved work. There are still eight projects/packages. Retain the Frame Protocol library/client API and existing feature/constructor/consumer tests.
- Repository README, commit messages and PR metadata use English. Learner-facing application and project instructions remain Polish and assume basic programming with Rust learned from zero.

## Honest artifact evidence

A manifest exercise checks authored TOML declarations locally. It neither compiles Rust nor proves that Cargo resolved dependencies, tested the compiler floor, preserved a lockfile or packaged particular files. Success feedback and concept names must match that scope. Correct independent manifest artifacts may establish understanding and delayed retention of the declaration concept; they cannot substitute for the existing Rust evidence requirements.

Do not create custom metadata policy tables and claim Cargo enforces them. `--locked`, `cargo update`, feature unification and package verification are demonstrated with actual authored Cargo results and practiced in the downloadable project. Do not ask learners to manually edit Cargo.lock to manufacture the expected resolution. A checkbox or pasted claim about running local commands cannot automatically award execution mastery.

Revealing a primary answer must leave its distinct blank task available as independent evidence. The Frame starter already contains complete working manifests, so viewing/downloading it provides help for the four new primary manifest tasks. The solution provides help for the four existing public-API primary tasks and the four new manifest primary tasks. Prior independently recorded evidence stays valid; fresh blank and retrieval tasks must not be exposed by these package actions.

## Parser and execution boundary

Use exactly `toml-eslint-parser@1.0.3` through `parseTOML(source, { tomlVersion: "1.0.0" })` and `getStaticTOMLValue`. Do not rely on its default grammar or add a handwritten TOML1.1 rejection parser. Root has already proved a disposable browser-platform bundle, expected manifest values, duplicate-key rejection and rejection of four TOML1.1-only forms. The real Next browser/client bundle, server imports and exact Cargo1.85 compatibility corpus remain required checks.

The parser declares `^20.19.0 || ^22.13.0 || >=24`; this repository deliberately supports `^22.13.0 || >=24`. Record the supported runtime in package metadata/documentation and keep CI on the current Node22 release. Check actual package engines during installation; do not assume every Node version above22 satisfies a dependency's engine range.

Actual resumed verification confirms Cargo 1.94+ accepts TOML 1.1 (see the official Rust 1.94 release announcement), whereas exact Cargo 1.85 rejects the four 1.1 probes. The syntax corpus records this intentional version difference; it must not require new stable Cargo to reject syntax it officially supports. All accepted course answers remain TOML 1.0 for the supported compiler floor.

All manifest checks are deterministic, local and offline. `RunRequest`, `RunResult`, `RunStatus`, trusted Rust fixture targets and `/api/run` remain unchanged. Reuse the draft `code` field and record attempts without a synthetic RunResult. Treat parser failures as bounded feedback, not exceptions escaping the application. Limit input length and parsed nesting/work, and ensure assertion traversal uses own properties and unambiguous path segments.

Accept equivalent TOML layout, table notation, quotes and ordering. Dependency short/table forms are equivalent when their effective defaults match the explicit exercise contract. Feature lists are sets for these tasks. Preserve harmless extra valid fields; do not compare the whole parsed object or the serialized answer to a reference. Version requirements must be specified precisely in prompts; only claim equivalence actually handled by the evaluator.

## Downloaded Cargo project

Extend `frame-protocol-workspace`, retaining `frame-protocol` and `frame-probe` members, resolver3, edition2024, Rust1.85.0, empty default features and publish=false. Add one direct registry dependency:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

The library adds:

```toml
[features]
default = []
diagnostics = []
format = ["dep:serde", "serde/alloc", "serde/derive"]

[dependencies]
serde = { workspace = true, optional = true }
```

The client adds `format = ["frame-protocol/format"]` beside its existing diagnostics forwarding. Its path-only dependency remains local; it is not represented as a registry-publishable package.

Use a feature-gated `serde::Serialize` implementation on Frame. Do not derive Deserialize directly: it would bypass `Frame::try_from_payload` and permit an invalid payload length. Keep every existing constructor and API invariant. Add a real feature consumer that requires Serialize, and show its distinct library-only and client-forwarded builds. Default builds do not activate serde, although the lockfile includes the optional dependency closure.

Generate and check in the authored lockfile rather than inventing checksums. The verified candidate closure contains nine package entries: two workspace members plus serde, serde_core, serde_derive, proc-macro2, quote, syn and unicode-ident. Verify actual pinned versions/source/checksums and compiler compatibility during implementation. A narrow dependency requirement in Cargo.toml and a precise selection in Cargo.lock serve different purposes.

Run packaging only for the library with `cargo package -p frame-protocol`. Keep publish=false. Inspect the real generated file list and normalized manifest, including Cargo.lock and Cargo.toml.orig, and verify the extracted crate on stable and exact Rust1.85.0. Whole-workspace packaging must not be a success gate: the local client references an unpublished library package. No cargo login, cargo publish, credential setup or crate upload belongs to this stage.

Root-reviewed feasibility evidence is in `<private-temp>/receipt-010` and `<private-temp>/receipt-013`. Those disposable proofs do not replace verification of the final downloaded archive.

## Author and release verification

Extend the existing fixed-archive workspace verifier with an explicit --fetch option, followed by offline/locked checks. Reject other command-line inputs; do not accept learner manifests, paths, sources, dependencies or toolchain selections. Retain existing API mutants and add meaningful dependency, feature-forwarding and archive-boundary controls. Missing cache, process failures and zero test execution are infrastructure failures, not successful rejection of an exercise.

Both stable and exact Rust1.85 must cover separate library/client/workspace feature configurations, metadata, tree, tests, fmt, Clippy, rustdoc, package contents and lockfile immutability. The starter must remain fmt/check-valid and its unfinished Rust test suites must still fail for their intended implementations. Fresh CI jobs must fetch the authored locked dependency closure before offline verification.

Manifest-specific author validation checks all reference and retrieval solutions plus deliberately incorrect starters and semantic mutants. A fixed repository-authored TOML syntax corpus must be checked with the JavaScript parser and actual stable/exact1.85 Cargo. It must never execute learner-submitted TOML through Cargo.

Final integration checks cover existing v3 import/export, old drafts/notes, new TOML drafts, independent gates after either archive is revealed, delayed retrieval, accurate editor/button labels, no manifest request to /api/run, the alternative textarea, keyboard access and offline resumption. Run the full existing regression/CI suite and a production build, production E2E without retries, and offline verification with a new service-worker cache version.

Release uses a reviewed feature branch, English commit/PR metadata and successful checks for the exact PR head before merge. Record PR8/main57c24f9 verification as preceding release evidence. Hosting remains unselected, so this block does not introduce a deployment target.

## Design review rulings

- Manifest concepts use an authored artifact classification, defaulting existing concepts to Rust code. Engine recomputation receives the policy explicitly through a course-aware facade outside the engine. Do not infer concept classification from imported events, or use `Rust proof || manifest proof` for every concept. Filter mismatched artifact events before strong-evidence/retention calculations. The facade must inject the policy for lesson submissions, exposure, reviews and package reveals so later exposure cannot downgrade valid manifest mastery.
- The parser's static-value helper builds ordinary JavaScript objects. Check bounded AST key segments before calling `getStaticTOMLValue`; reject `__proto__`, `constructor` and `prototype` keys in this adapter. Use the parser's official visitor keys with an iterative walk that excludes parent links, not a handwritten TOML parser or a raw source regex. Asserted paths then use own-property traversal. Quoted string values and comments containing those words are valid; unrelated valid dates and arrays in metadata remain allowed.
- Cargo.lock can contain nine packages even when the default resolved graph does not activate serde. Verify dependency declarations with metadata separately from the resolved feature graph. Inspect and assert the actual default and all-feature graphs instead of assuming both contain nine active packages.
- Ordinary Vitest runs precede registry fetching in CI. Metadata unit fixtures must use `cargo metadata --no-deps --offline` when testing declarations, and must not require an already populated Cargo cache. Full resolved-graph/archive checks run in the dedicated verifier after its explicit fetch.
- Blank and delayed-review tasks change declaration role or policy, not just names: workspace dependency versus aliased direct/dev dependency; library optional feature versus client forwarding; root compiler floor versus member inheritance/standalone floor; include versus exclude package policy. Complete task prompts state every graded value and constraint in prose. Blank steps have no starter manifest or pasted solution skeleton.

Parser feasibility record: `<private-temp>/receipt-009`. Use `cargo fetch --locked` without `--all-features` (the latter is not supported by Cargo1.85 fetch). Verify publish=false in both Cargo metadata and the normalized packaged manifest. Inspect only selected `.resolve.nodes` when asserting the dependency graph, rather than every possible dev/optional dependency in transitive package definitions.

## Exact learner contract table



This is the compact implementation handoff after review. Primary ids are
`${lessonId}-gate`, as required by the module gate. Every blank and review is
freshly authored; no task relies on hidden defaults. Snippets are complete
files for the editor. TOML formatting, key/table order, equivalent quotes and
inline-table order remain semantic alternatives.

### `cargo-dependency-contract`

**Primary `cargo-dependency-contract-gate`** — file `Cargo.toml`, Frame root.
Require the existing two members, `resolver = "3"`,
`workspace.package.rust-version = "1.85.0"`, `workspace.package.publish =
false`, and this exact effective dependency:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

Polish prompt: “Complete root Frame Protocol by one registered relationship `serde`: require `1.0.229` and
disable default features. Keep two members, resolver `3`, Rust `1.85.0` and `publish = false`. The result
checks the declaration; availability of the crate and selection of the version you will
check later on local Cargo.’ The complete expected root is `workspaceManifest` in `src/content/projects/frame-protocol.ts`, extended with the
dependency table above. Content authors may read the completed manifest through the
exported project's `package.files` entry for `Cargo.toml`; do not duplicate a different baseline.

**Fresh `cargo-dependency-contract-blank`** — standalone
`catalog-tool/Cargo.toml`, deliberately distinguishing normal and dev scope:

```toml
[package]
name = "catalog-tool"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A catalog dependency exercise."
license = "MIT"
publish = false

[dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false }

[dev-dependencies]
wire_serde = { package = "serde", version = "1.0.229", default-features = false, features = ["alloc"] }
```

Polish prompt: “Create a Standalone Package `catalog-tool`. The usual code is to use an alias `wire_serde`
for the registered `serde` without default features; tests may have a separate declaration
in `[dev-dependencies]`. Do not transfer the test relationship to the normal range and don't edit
lockfile.’ The contract requires the same alias in both telescopes, the same register
version and disabled defaults, an empty normal feature set and alloc in the dev view; it
rejects a path/git source or a remote in only the crow scope.

**Fresh `cargo-dependency-contract-review`** — standalone
`telemetry/Cargo.toml`:

```toml
[package]
name = "telemetry"
version = "0.2.0"
edition = "2024"
rust-version = "1.85.0"
description = "A telemetry dependency exercise."
license = "MIT"
publish = false

[dependencies]
serde_wire = { package = "serde", version = "^1.0.229", default-features = false }
```

Polish prompt: “Repeat without workspace: alias `serde_wire` is to indicate the register package
`serde`, require `^1.0.229` and do not include default features. Explain that `Cargo.toml` provides a
requirement, and `Cargo.lock` a choice for a particular graph.” `"1.0.229"` and `"^1.0.229"` are accepted as
equivalent Cargo requirements here.

### `cargo-resolver-feature-unification`

**Primary `cargo-resolver-feature-unification-gate`** — file
`crates/frame-protocol/Cargo.toml`. Require the complete canonical library
manifest from the project's `package.files` entry for `crates/frame-protocol/Cargo.toml`, especially:

```toml
[features]
default = []
diagnostics = []
format = ["dep:serde", "serde/alloc", "serde/derive"]

[dependencies]
serde = { workspace = true, optional = true }
```

Polish prompt: “Add opt-in `format` and optional, workspace `serde`. `format` is to openly turn on
`dep:serde`, `serde/alloc` and `serde/derive`; `default` and `diagnostics` remain empty.” The Evaluator treats feature array arrays
as sets and rejects missing `alloc`, `derive`, optionality or workspace inheritance.

**Fresh `cargo-resolver-feature-unification-blank`** — file
`crates/packet-cli/Cargo.toml`, a client transfer contract with two forwarded
local features:

```toml
[package]
name = "packet-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
diagnostics = ["packet-lib/diagnostics"]
format = ["packet-lib/format"]

[dependencies]
packet-lib = { path = "../packet-lib" }
```

Polish prompt: “The client `packet-cli` is to default on nothing and to pass exactly two local
features of the library: `diagnostics` and `format`. Do not add heart directly to the customer.” The
contract requires both forwarding entries,empty default and one local path defaultcy,
with no direct district defaultcy.

**Fresh `cargo-resolver-feature-unification-review`** — file
`crates/telemetry-cli/Cargo.toml`, alias-forwarding variant:

```toml
[package]
name = "telemetry-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[features]
default = []
json = ["telemetry_core/json"]
diagnostics = ["telemetry_core/diagnostics"]

[dependencies]
telemetry_core = { package = "telemetry-lib", path = "../telemetry-lib" }
```

Polish prompt: “Transmit two features of the library from the client by alias
dependencies `telemetry_core`: `json` and `diagnostics`; `default` is to be empty. Distinguish the alias of the package
from the features names. This variant does not introduce the syntax weak maturity `?/`;
do not use it without a separate contract.” No weak maturity feature forms is strongly
accepted by this review.

### `cargo-lock-msrv-policy`

**Primary `cargo-lock-msrv-policy-gate`** — file `Cargo.toml`, Frame root.
Require the existing two members, `workspace.resolver = "3"`,
`workspace.package.rust-version = "1.85.0"`, `workspace.package.publish =
false`, and the real dependency declaration:

```toml
[workspace.dependencies]
serde = { version = "1.0.229", default-features = false }
```

Polish prompt: “Set up a real compiler floor Rust `1.85.0` and resolver `3`; keep the default
requirement `serde 1.0.229` and `publish = false`. Do not create a table pretending to be politics CI and do not
change manually `Cargo.lock`.” The automatic contract checks real Cargo fields only. The
exploration says that exploit `cargo update` may change the lockfile, while later `--locked` checks refuse
a required change; it never claims these commands wounds.

**Fresh `cargo-lock-msrv-policy-blank`** — file
`crates/release-lib/Cargo.toml`, member-inheritance variant:

```toml
[package]
name = "release-lib"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
description.workspace = true
license.workspace = true
repository.workspace = true
readme.workspace = true
publish.workspace = true

[features]
default = []

[dependencies]
serde = { workspace = true, optional = true }
```

Polish prompt: “The member’s Manifesto is to inherit `rust-version` And root metadata. Don't add
local `rust-version` neither the local version that overwrites inheritance; dependence `serde` is to
use `workspace = true` and remain optional.” The contract requires every listed inheritance key,
requirements `package.rust-version.workspace = true` and `package.version.workspace = true`; a scalar override fails these nested-path assists. Do not
require the whole rust-version/version path to be absent, because the inheritance tables live there. No
arbitrators metadata policy table earns credit.

**Fresh `cargo-lock-msrv-policy-review`** — standalone `stable-floor/Cargo.toml`:

```toml
[package]
name = "stable-floor"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "A compiler floor exercise."
license = "MIT"
publish = false

[dependencies]
serde = { version = "^1.0.229", default-features = false }
```

Polish prompt: « Play a self-contained package with `rust-version = "1.85.0"` and undefault `serde ^1.0.229`. In the
explanation, indicate that public `cargo update` can change lockfile and command from `--locked` is to
refuse the required change; do not write these claims in an artificial metadata table.’

### `cargo-package-rehearsal`

**Primary `cargo-package-rehearsal-gate`** — file `Cargo.toml`, Frame root.
Require complete package metadata (`description`, `license`, `repository`,
`readme`), `workspace.package.publish = false`, the existing two members and
resolver `3`, and absence of both root `include` and `exclude`. Polish prompt:
„Zachowaj metadane i `publish = false`; nie dodawaj `include` ani `exclude`.
Lokalnie wybierz `cargo package -p frame-protocol` i zapisz output; aplikacja
nie wykonała pakowania.” The canonical root manifest is the complete answer.

**Fresh `cargo-package-rehearsal-blank`** — standalone
`signal-kit/Cargo.toml`, explicit include policy:

```toml
[package]
name = "signal-kit"
version = "0.3.0"
edition = "2024"
rust-version = "1.85.0"
description = "A signal library for package rehearsal."
license = "MIT"
repository = "https://example.invalid/signal-kit"
readme = "README.md"
publish = false
include = ["Cargo.toml", "README.md", "src/**", "tests/**"]

[lib]
path = "src/lib.rs"
```

Polish prompt: “Prepare `signal-kit` for local rehearsal. Set all given metadata, `publish = false` and the
public target library. By `include` enable only `Cargo.toml`, README, `src/**` and `tests/**`; the named file
generated `build/generated/signal.rs` is to remain outside the archive because it does not fit the include list.
Later check the list by `cargo package --list`.’ The contract requires this include set and no exclusive;
it does not claim that the named file or archive exists.

**Fresh `cargo-package-rehearsal-review`** — standalone
`archive-note/Cargo.toml`, exclude policy without include:

```toml
[package]
name = "archive-note"
version = "0.1.0"
edition = "2024"
rust-version = "1.85.0"
description = "An archive boundary exercise."
license = "MIT OR Apache-2.0"
repository = "https://example.invalid/archive-note"
readme = "README.md"
publish = false
exclude = ["fixtures/large.bin", "build/generated/**", "notes/**"]

[lib]
path = "src/lib.rs"
```

Polish prompt: « Play a manifesto `archive-note` with metadata, `publish = false` and without `include`. Exclude by `exclude`
large fixture, generated build files and notes. Explain that `cargo package -p archive-note --list` only show the actual
list.” The contract requirements `exclude` and absence of `include`, so both politicians can not be
hidden in one answer.

The only Cargo output claims for these contracts are procedures or authored
verification assertions: dependency existence/resolution, feature union,
stable/MSRV support, lockfile immutability, normalized manifest and actual
archive membership. A TOML evaluator never reports those claims as executed.


### Root clarifications for authors

The prose above is a design outline. Final learner prompts must name every required package name, version, edition, inherited key, feature set, path and flag that the evaluator checks; references alone do not supply a hidden contract. Descriptions may be any nonempty explanatory string. Primary lesson1 grades the dependency fields while its preserved baseline fields are supplied; primary lesson3 grades restoration of resolver/compiler-floor fields while its unchanged dependency is supplied. They may result in the same full project root, but their unfinished starters and conceptual failure cases must differ. Blank lesson1 uses the same alias wire_serde in normal and dev scope, avoiding two names for the same resolved crate; dev alone enables alloc. Verify these authored manifests with controlled Cargo contexts during review. Version equivalence in these tasks is explicitly limited to the shown full caret requirement with an optional leading caret (`1.0.229`/`^1.0.229`); other semver expressions are outside this exercise contract.

## Shared implementation interfaces

Define manifest contracts in `src/domain/manifest.ts` and import their types into `types.ts`. These are the shared interfaces for parallel authors:

```ts
export type ManifestPath = readonly [string, ...string[]];
export type ManifestValue = string | number | boolean | readonly string[];
export interface ManifestSetExpectation {
  values: readonly string[];
  mode?: "equals" | "contains";
}
export type ManifestDependencySource =
  | { kind: "registry"; registry?: string }
  | { kind: "path"; path: string }
  | { kind: "workspace" };
export interface ManifestDependencyExpectation {
  name: string;
  package?: string;
  /** Full stable caret requirement; a leading ^ is optional. */
  version?: string;
  source?: ManifestDependencySource;
  optional?: boolean;
  defaultFeatures?: boolean;
  features?: ManifestSetExpectation;
}
export type ManifestAssertion =
  | { kind: "dependency-package-absent"; table: "dependencies" | "dev-dependencies" | "build-dependencies" | "workspace.dependencies"; package: string }
  | { kind: "path-present"; path: ManifestPath }
  | { kind: "path-absent"; path: ManifestPath }
  | { kind: "path-nonempty-string"; path: ManifestPath }
  | { kind: "path-equals"; path: ManifestPath; value: ManifestValue; arrayMode?: "ordered" | "set" }
  | { kind: "dependency"; table: "dependencies" | "dev-dependencies" | "build-dependencies" | "workspace.dependencies"; dependency: ManifestDependencyExpectation }
  | { kind: "feature-forwarding"; package: string; feature: string; enables: ManifestSetExpectation };
export interface ManifestContract {
  document: "workspace-root" | "package";
  assertions: readonly ManifestAssertion[];
}
```

`workspace-root` requires a workspace table and no package table; `package` requires a package table and covers both members and standalone packages. This is a selected-declaration contract, not a complete Cargo validator. A workspace dependency cannot declare optionality at the root; reject that field there. In a member, a workspace dependency checks only the inheritance and explicitly supplied flags, without inventing root values from another file. Registry/path/workspace sources must not silently accept conflicting source selectors. For direct dependencies, omitted optional/default-features/features normalize to false/true/empty. An alias uses the table key as the dependency name and `package` as the canonical crate name.

Reviewed amendment: `dependency-package-absent` checks all own entries of the selected dependency table by canonical package (`package` field or entry key). A missing table passes; an invalid table/dependency shape fails instead of bypassing the exclusion. The two client exercises exclude canonical `serde` from normal `[dependencies]`, including aliases; prompts state this selected scope explicitly. Harmless metadata remains allowed. This local check does not infer unseen workspace dependency aliases or resolve target-specific manifests. Normal standalone serde dependencies in the blank/review are explicitly nonoptional (`optional: false`); their prompts and semantic mutants must cover it.

The `feature-forwarding` assertion has one unambiguous meaning: `package` is the current manifest's `package.name`, `feature` is the local `[features]` key, and `enables` lists that key's declarations. Both package identity and the exact named local feature must match. Never fall back to reading a feature named by the package field; there are no legacy persisted manifest contracts to migrate. Example: `{ kind: "feature-forwarding", package: "packet-cli", feature: "format", enables: { values: ["packet-lib/format"] } }`.

Add `Evaluator` variant `{ kind: "manifest-contract"; contract: ManifestContract }`, `LessonStep.editorMode?: "rust" | "toml"`, `LessonStep.editorFile?: string`, `Concept.evidenceArtifact?: "rust-code" | "manifest"`, and `ProjectPackage.starterRevealStepRefs?: ModuleGateTaskRef[]`. No other persisted field is required. A TOML observation may use a choice/answer evaluator with TOML code; it has no compiler status. All TOML code/reference documents must have valid supported syntax, and manifest evaluator references must pass their contract. Blank tasks omit code. Nonblank gate starters must parse but fail the intended contract. Do not create a fake expectedStatus for TOML.

`src/engine/manifest-contract.ts` exports:

```ts
export interface ManifestContractCheck {
  passed: boolean;
  feedback: string;
}
export function manifestContractIssues(contract: ManifestContract): string[];
export function manifestSyntaxIssues(source: string): string[];
export function checkManifestContract(source: string, contract: ManifestContract): ManifestContractCheck;
```

All success/failure feedback reaching the learner is Polish. Syntax checking and contract evaluation share one safe parser adapter. Before parsing cap UTF-8 input at65536 bytes; before static conversion cap AST depth at64 and visited nodes at20000 and guard dangerous key segments. Limit contracts to64 assertions, paths to12 segments, and authored key/string lengths to4096 characters. Report parser line/column where available, with bounded text. Ignore parent links during traversal. Empty contracts never pass. Exercise assertions operate on own properties and do not coerce types. Reference version strings compare only the specified full caret form with optional leading caret. Include/exclude arrays are policy sets; generated Cargo.toml/Cargo.lock additions remain Cargo behavior that requires actual package inspection.

`src/engine/learning.ts` exports `EvidencePolicy` and `evidencePolicyForConcepts`, adds an optional policy to recordEvidence/recordLessonExposure, and defaults old raw callers to Rust:

```ts
export type EvidenceArtifact = "rust-code" | "manifest";
export interface EvidencePolicy {
  artifactForConcept(conceptId: string): EvidenceArtifact;
}
export function evidencePolicyForConcepts(concepts: readonly Concept[]): EvidencePolicy;
export function recordEvidence(state: UserState, event: EvidenceEvent, policy?: EvidencePolicy): UserState;
export function recordLessonExposure(state: UserState, exposure: LessonExposure, policy?: EvidencePolicy): UserState;
```

Preserve the legacy undefined-evaluator fix/project proof behavior for Rust, as current v1/v2-compatible evidence requires; it cannot supply manifest artifact proof. For manifest concepts require explicit `manifest-contract` artifact evidence. In both directions exclude the other artifact kind from strong-task and retention proof, while retaining existing neutral answer/choice/order/self-rating rules. Current timing, two-distinct-task, hint and reveal requirements stay intact.

Create `src/content/learning-context.ts` as the only course-aware facade:

```ts
export function recordCourseEvidence(state: UserState, event: EvidenceEvent): UserState;
export function recordCourseLessonExposure(state: UserState, exposure: LessonExposure): UserState;
export function revealCourseProjectPackageVariant(state: UserState, project: ProjectPackage, lessons: Lesson[], variant: PackageVariant, now: number): UserState;
```

It imports authored concepts, builds the policy and calls raw engine/domain functions. All production UI lesson, review and package exposure paths use this facade. The engine never imports the course. Add raw `revealProjectPackageVariant(state, project, lessons, variant, now, policy?)` in `src/domain/project-package.ts`; retain revealProjectSolution as a compatible solution wrapper. Starter uses only starterRevealStepRefs; solution uses the union of both lists, deduplicated. Opening the starter preview and clicking its download both record starter exposure before exposing the files; showing or downloading the solution records solution exposure. Repeated access must be idempotent. Frame's existing four Rust refs stay in revealStepRefs; its four new primary TOML refs go in starterRevealStepRefs. Validation checks both lists and effective refs. Existing unrelated packages have no starter refs and retain their current behavior.

CodeEditor accepts `language?: "rust" | "toml"`, default Rust. Register an idempotent TOML Monarch tokenizer using the existing Monaco instance; it highlights syntax but does not implement validation. Preserve themes and accessibility. TOML uses `Cargo.toml` or the authored editorFile, `Kod TOML`, and `TOML 1.0 · sprawdzenie deklaracji`. A TOML editor never displays an actionable Rust run button. Manifest-contract tasks and reviews have `Sprawdź manifest`, which evaluates current code locally; TOML prediction/observation steps use their answer control. Rust labels and request payloads remain unchanged.

## Content ownership and exports

Two content author files own two lessons each, without importing the course or each other:

- `src/content/cargo-dependencies.ts`: exports `cargoDependencyLessons`, `cargoDependencyConcepts`, `cargoDependencyCompetencies`, `cargoDependencySources`, `cargoDependencyReviewExercises`; owns lesson1/2 IDs above.
- `src/content/cargo-release-policy.ts`: exports `cargoReleaseLessons`, `cargoReleaseConcepts`, `cargoReleaseCompetencies`, `cargoReleaseSources`, `cargoReleaseReviewExercises`; owns lesson3/4 IDs above.
- Root creates `src/content/cargo-dependency-lifecycle-module.ts` exporting `cargoDependencyLifecycleModule`, integrates all exports and project refs, and owns final E2E/offline/docs/release.

All four new concepts set evidenceArtifact to manifest. Primary/blank tasks use assessment/transfer evidence respectively, with evidenceGate=true. Separate review exercises use recall. Use reviewed official Cargo sources with reviewedAt equal to the actual review date (2026-09-17 for this resumed implementation); preserve prior source IDs. Author verifications must accept reordered tables/feature sets and equivalent dependency forms, reject omitted/wrong fields and overly broad default features, and inspect fresh manifest contexts rather than merely asserting the reference equals itself.

For include/exclude exercises, explicitly distinguish the declared file policy from the generated archive: Cargo can add `Cargo.lock` and `Cargo.toml.orig` and normalize `Cargo.toml`. The local `cargo package --list` observation is authoritative for archive membership.
