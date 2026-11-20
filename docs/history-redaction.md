# History redaction and current compatibility

Some historical documentation and archived report presentation copies have local
machine and disposable receipt paths redacted. Historical source, input and
archive hashes retain their original meaning. These copies are not byte-identical
raw receipts or newly executed verification. Existing failures, incomplete results
and acceptance limits remain unchanged.

The following 14 repository paths contain the reviewed historical presentation
changes (not every revision of each path changed):

- `.superpowers/sdd/2026-09-18-capstone-integration/task-1-report.md`
- `.superpowers/sdd/2026-09-18-capstone-integration/task-4-report.md`
- `.superpowers/sdd/2026-09-18-capstone-integration/task-6-report.md`
- `docs/curriculum-review-2026-10-08.md`
- `docs/dependency-audit-2026-10-06.md`
- `docs/evidence/capstone/msrv-report.json`
- `docs/evidence/capstone/stable-report.json`
- `docs/progress.md`
- `docs/superpowers/plans/2026-09-18-capstone-integration.md`
- `docs/superpowers/plans/2026-09-25-macros-as-api.md`
- `docs/superpowers/plans/2026-10-15-advanced-continuation.md`
- `docs/superpowers/specs/2026-09-13-cargo-dependency-lifecycle-design.md`
- `docs/verification.md`
- `src/content/fixtures/m11-m10-identity.json`

The M10 fixture differs only at `provenance.inputPath`, now
`<private-input:legacy-m10-projection>`. Its historical SHA256 is
`59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7`;
its exact redacted SHA256 is
`2ef586f7b67f8f83621c1e53c3b4bfdddec9dc89c1af4612ed702f978607c563`.
The current reader exception checks that exact byte hash, exact placeholder and
SHA256 `7b0e3731da535f2c4eb4f844d0510958ae455367aa9a105470f953428a296785`
after parsing JSON, masking only `provenance.inputPath` with
`<metadata-path-omitted-for-semantic-identity>` and serializing with
`JSON.stringify` in parsed key and array order. This preserves all other
provenance, source identities, schema, IDs, definitions, ordered arrays and
saved-state structures. It is a fixed reviewed delta, not permission for future
fixture changes.

The immutable receipts `async-send-pre-handoff.json`,
`async-cancel-pre-transfer.json` and `documentation-guided-repair-legacy.json`
retain their original bytes and old fixture hash. The three current readers
accept only this reviewed fixture successor; the cancellation reader also retains
its previously reviewed native-test-support exception. Every other receipt entry
still requires its original whole-byte hash. The M10 transfer reader remains
unchanged and continues to check semantic arrays and historical source identities.

Rewritten historical trees retain their original readers. In particular,
`async-lending-send-compatibility.test.ts`,
`async-lending-cancel-compatibility.test.ts` and
`documentation-guided-repair-integration.test.ts` can fail their original
whole-byte fixture assertions after redaction. Current successor results apply
only to the successor HEAD; they do not establish passing tests across history,
fresh native proof, publication readiness or erasure at an external provider.
The ordinary initialized-prefix test may skip without its documented authorization
inputs; a skip or unavailable prerequisite is not a native pass. See
[async transfer evidence](async-transfer-evidence.md) for the dated source and
verification boundaries.
