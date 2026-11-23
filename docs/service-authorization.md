# Typed request-bound authorization

[Polski](service-authorization.pl.md)

Source record: 4 November 2026. This optional extension follows service
operations and adds four lessons, 24 steps, two concepts and four distinct
primary coding families. It adds no learning-duration estimates. The current
catalog contains 50 modules, 202 lessons, 1,347 steps, 198 concepts, 199
competencies, 349 sources and 15 projects; Core retains its 17 modules.
These are authored availability counts, not learner results.

## Four operations

- **Exact-scope decision:** a single configured grant must cover the subject,
  tenant, scope, action and declared cost. Grants cannot be spliced together.
- **Attenuation:** retain subject and tenant, narrow scope and actions, and
  never increase the cost maximum. Return the exact requested child or reject
  amplification. Computing a child does not revoke the parent: the host must
  explicitly install the child for subsequent decisions.
- **Request binding:** move the exact owned request and principal into a
  witness retaining an actual authority borrow. Read-only accessors preserve
  the original resource, action, cost and payload. A witness may be dropped;
  a fresh authorization may be issued later. Ownership is affine.
- **Consuming admission:** consume the witness, check accepting, checked
  accepted-count increment/capacity, then checked charged-cost increment/budget.
  Commit both counters only after every check. Rejection leaves both unchanged.
  The service checks its own authority before admission; denied work is never
  charged. Accepted is an admission observation, not execution or durability.

## Lesson models and native API

Each browser task contains only its assessed operation. The policy and
attenuation models supply no other family's implementation. The binding model
uses an explicitly labeled deterministic argument-checking test double, not the
native policy. The admission model receives a fixed test witness and ledger;
that model does not prove earlier authorization. Blank steps and ordinary
reviews have genuinely empty editors and provide a minimal non-solution
scaffold in the prompt. Apply and blank aliases share a family; retrieval and
self-rating do not create fresh independent primary credit.

The separate dependency-free `service-authorization-workshop` package composes
all four operations behind a private Rust module. It targets Rust 1.85.0,
edition 2024. Its service owns its authority and ledger; it has no public intake
for a witness from another authority. The retained borrow blocks a local policy
replacement while a witness remains live and is subsequently used. Compiler
controls for privacy, move and borrow relationships belong to that native API,
not to a mocked browser response or a one-file lesson's root-private scaffold.

Synthetic principals and host-installed grants are trusted fixture inputs.
There is no authentication, TLS, credential validation, global replay prevention,
wall-clock expiry or distributed revocation. Declared cost is neither measured
work nor a bound on payload memory or CPU. There is no network service,
production security guarantee, or learner readiness claim in this extension.

## Package and verification boundary

Each starter and solution ZIP contains ten authored files: `Cargo.toml`,
`Cargo.lock`, `src/lib.rs`, four operation test files, `README.md`,
`THREAT_MODEL.md` and `WORKSHEET.md`. The builder adds exactly four canonical
notices: `LICENSE`, `LICENSE-CONTENT`, `LICENSE-SCOPE.md` and
`THIRD-PARTY-NOTICES.md`, for fourteen members under the package root. No Apache
exception applies. The starter replaces exactly four operation bodies with
`todo!`; it does not supply target solutions. Its exposure-reference list is
empty. Viewing the full solution records help on the exact eight apply/blank
references across all four families, without completing them or rewriting old
evidence.

The ProjectContract's three required evidence items cover policy/ledger
boundaries, compiler and semantic controls, and exact principal/request field
forwarding. The standalone verifier (`npm run content:authorization`, with
optional `-- --msrv`) operates only on fixed authored package material and
compiler controls. It does not execute imported learner source. Native package
receipts, lesson-model compiler receipts, browser UI/state checks and learner
independence remain separate observations.

The six named scenarios in `tests/e2e/service-authorization.spec.ts` cover
portable synthetic predecessor resume, drafts/notes, family help and retrieval,
exact archive bytes/notices, keyboard navigation at 390px, an actual offline
reload with a new neutral exposure, and out-of-order DOM source inspection.
Intercepted runner successes check UI/state behavior only; they never prove
native Rust execution. Source authoring or test discovery is not a browser pass.
Final owned production/browser qualification is recorded separately by the
local source administrator. Publication, remote integration and GitHub Actions
acceptance remain separate holds.

## Finite material and license record

This delta is maintainer-directed, AI-assisted code and teaching material.
Executable Rust examples, tests and operational TypeScript metadata follow the
existing MIT scope; original Polish prompts, explanations and package worksheet
prose follow CC BY 4.0. The existing owner credit and canonical notices remain
required under the [licensing guide](licensing.md). Mixed files retain the
material-based split. No new license or human-authorship assertion is introduced.

The bounded review uses existing internal service/ownership/visibility/testing
references. It identifies no new vendored third-party code payload in these
new sources; references are not automatic permission to copy their expression.
The [finite ledger](oss-provenance.json) records exact covered file hashes;
new untracked source is enumerated separately until the administrator stages
and rechecks the final inventory. Neither a hash nor this record establishes
exhaustive rights clearance or permission to publish. Existing rights,
trademark, privacy and publication limitations continue.
