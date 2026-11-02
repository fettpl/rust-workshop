# Frame Protocol maintenance checkpoint

The optional `api-frame-protocol-maintenance` lesson follows the four existing
Public API Workspaces lessons. Its only hard prerequisite is
`api-compatible-surface`; the later release-matrix module is useful context,
not a new beginner-route requirement.

The educational workspace candidate is 1.1.0 with `publish = false`. It adds
non-exhaustive `FrameErrorCode`, `FrameError::code()`, and an explicit
`diagnostics` error summary while preserving the old client surface, source
error, wire format, feature defaults, and exact Rust 1.85.0 MSRV. Default and
no-default client output remains `frame-probe: payload=4 bytes`. The guided
diagnostics client observes an `UnexpectedEof` independently through typed
category and `Error::source`, rather than parsing display text. `format` stays
an independent serde feature; this change adds no external dependencies.

The downloadable workspace contains two unfilled Polish worksheets:
`MAINTENANCE-CHALLENGE.md` and `CHANGE-REVIEW.md`. The learner works in their own
environment, chooses the internal design, retains old function-pointer,
legacy, dyn and non-Clone/non-Debug consumers, and adds a different regression:
a deterministic `BrokenPipe` writer plus an over-limit rejection before
payload I/O. The review packet asks for alternatives, observed test results,
a contract-based review response and disposition. No external reviewer or
particular internal architecture is required.

The six browser steps provide prediction, explanation, a std-only illustration,
a structured challenge, review self-rating, and ordinary same-session recall.
They do not execute the downloaded Cargo workspace or award an independent
coding family. Existing concepts, calibrations, review exercises, four module
criteria, saved positions and historical evidence keep their identities.

This lesson is explicitly authored as `practiceOnly`. That role records an
optional, ungated practice checkpoint; it is not a gate or independent coding
credit. Its steps may contain exposure, prediction, same-session recall and
rubric self-rating, but must not add an evidence gate or `codingTaskId`.
Curators must also keep it out of module gate task references, module
assessments and a project's primary `lessonId`; ordinary lessons remain subject
to the normal non-rubric evidence-gate audit. The content check and source audit
share this role policy, and the audit reports the checkpoint under
`practiceOnlyLessons`.

Maintainer verification is restricted to fixed repository-authored fixtures:

```sh
npm run content:packages
npm run content:workspace
npm run content:workspace -- --msrv
npm run content:supply-chain
npm run content:check
npm exec vitest run src/content/api-frame-protocol-maintenance.test.ts src/content/public-api-integration.test.ts
```

Use the offline dependency and tool preparation described in
[CI and local verification](ci-cd.md). A completed command is evidence only
for its declared authored fixture and selected compiler. Missing tools,
dependencies, unexpected compiler errors and timeouts are infrastructure
failures. Intentionally compiler-rejected clients must match the declared
phase and diagnostic; behavioral mutants must compile before their named
assertion rejects them.

Embedded release evidence identifies the accepted predecessor source cut and
normalized fixture/file hashes, excluding itself. The final commit/tree and
full generated archive digest belong to the external coordinator report;
they cannot be embedded in the archive they identify. Cargo-deny/advisory
snapshots retain their recorded unsupported/infrastructure hold and are not a
fresh advisory clearance. Frame Protocol has no macro change; the existing
Macros as APIs fixture remains separate.

Authored scope, browser self-rating, and maintainer fixture checks do not
establish learner competence, delayed retention, universal protocol safety,
or release readiness. Hosted checks and publication remain separate gates.
