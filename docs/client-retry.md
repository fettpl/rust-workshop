# Bounded client retry

[Polski](client-retry.pl.md)

This document records the scoped source, archive, and licensing boundary for
the optional `durable-log-retry` project. It is a contributor and maintainer
record, not a learner completion record and not a production reliability or
security claim.

## What is included

The package id is `durable-log-retry-workspace` and its project id is
`durable-log-retry`. It preserves the 40 authored files from the existing
durable-log service as explicit reference context in both starter and solution
variants. Those inherited files are compared byte-for-byte by the package
tests; they are not re-authored by this feature.

The four new package paths are:

- `crates/ingest-service/src/retry_client.rs`;
- `crates/ingest-service/src/bin/ingest-retry-client.rs`;
- `crates/ingest-service/tests/retry_client.rs`; and
- `RETRY-LAB.md`.

The Rust client and trusted tests use fixed repository-authored fixtures. The
verifier accepts only the closed optional `--msrv` selector, uses offline
locked Cargo commands, and does not execute learner or imported source. A
valid receipt, uncertainty result, refusal, and zero-attempt result are
separate claims in the fixture contract; native receipts do not establish
learner attainment or general service behavior.

## Provenance and license scope

The inherited durable-log files retain their existing provenance and package
notices. The three inherited Cargo manifests keep the previously approved
narrow `MIT OR Apache-2.0` package expression. The derived retry package uses
the same narrow exception because it carries those unchanged manifests; this
does not add an Apache license option for the repository, the application, or
the newly authored files.

The new Rust implementation, binary, and trusted native tests are
MIT-associated executable examples. The Polish worksheet and explanatory
prose in `RETRY-LAB.md` are authored teaching material under the repository's
CC BY 4.0 scope. The mixed TypeScript content module marks these regions
adjacently: executable data/code and programming examples follow the MIT
scope, while learner prompts and explanations follow CC BY 4.0. This is a
material-based split, not a blanket license for a mixed file.

The generated package carries the canonical repository notices and the
existing Apache notice required by the inherited manifests. No old archive
mapping or canonical license text is changed. The project does not copy or
vendor new third-party source in this slice; external dependencies retain
their own licenses and notices.

These statements describe the bounded source review for this feature. They do
not claim exhaustive copyright, trademark, patent, privacy, or publication
clearance. Any later concrete external-material finding must be assessed on
its own facts.

## Maintainer evidence boundary

`npm run content:client-retry` and its `--msrv` variant qualify only the fixed
authored archive and its stable/MSRV fixture controls. The private wrapper may
supply a qualified tool profile and offline Cargo home; the public verifier
does not depend on a maintainer's private directory layout. Raw commands,
versions, executable hashes, mutant outcomes, and failures remain evidence
for the bounded fixture run. They are not a hosted CI, release, or deployment
claim.

## Scoped generation review

This A10 delta is maintainer-directed AI-authored teaching material and code,
with the existing durable-log package retained as internal reference context.
The review found no identified external code payload in this scoped change;
existing repository sources and citations remain references rather than copied
third-party expression. This is a bounded technical review, not legal
clearance, a human-authorship finding, or publication permission.
