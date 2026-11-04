# Scoped provenance inventory

The [finite ledger](oss-provenance.json) records byte SHA256s for exactly the
Git-tracked files under `src/content/` and `public/`. It covers course/source
payloads and the five tracked public files; ignored Monaco distributions,
generated project archives, dependencies, repository history, and other paths
are outside this inventory. Their existing checks and notices remain separate.
The [licensing guide](licensing.md) defines the approved MIT/CC BY 4.0 split,
project credit, mixed-file rules, and three narrow Cargo exceptions. This ledger
does not grant rights or replace that guide.

Run from the repository root with Node, without installing any dependencies:

```sh
node --test scripts/verify-oss-provenance.test.mjs
node scripts/verify-oss-provenance.mjs --check
node scripts/verify-oss-provenance.mjs --release
```

Default mode is `--check`. Exit **0** means the schema, tracked coverage,
references, paths and current file bytes agree. Open rights gates remain visible.
`--release` returns **2** for a valid inventory with unresolved scoped rights,
**1** for invalid inventory or infrastructure failure, and **0** only when the
recorded review dispositions satisfy this limited provenance check. No result
establishes global OSS readiness, publication permission, integration, security,
privacy, CI status, or a visibility decision. After the maintainer's icon-origin
confirmation on 24 October 2026, the current project's expected release result
is **0**: both scoped groups are reviewed and their recorded blockers resolved.
This records the bounded assessment and acceptance, not exhaustive rights clearance.

## Current facts and review dispositions

- The course group records the maintainer's report of generation using ChatGPT
  and Codex from prompts and direction, with no manual drafting of fragments.
  The original bounded [rights assessment](rights-assessment.md) inventories
  294 course files and documents extracted-unit screening and contextual manual
  review. No actionable substantial copied-expression case was identified
  within that historical scope; `course-source-review` is resolved as that
  assessment record. The current finite ledger has 338 course files and five
  public files. This is a finite scoped inventory, not exhaustive clearance of
  all 338 course files. The later existing-lesson-contract correction delta is
  documented in the rights assessment. Bounded independent C1 provenance
  review completed. The bounded A10 retry delta is documented in
  [client-retry.md](client-retry.md); it records internal reference reuse and
  no identified external code payload in the scoped review, not legal
  clearance. The existing bounded rights, originality, publication, trademark,
  privacy and release limitations continue. Source citations remain leads,
  never automatic permission.
- The icon origin is traced assistant generation: private maintainer records
  show inline SVG construction with a successful receipt, followed by an
  assistant-reported palette change. Current PNGs reproduce byte-for-byte and
  pixel-for-pixel from the SVG using the measured sharp pipeline. This does
  not establish human authorship, historical tool versions or trademark
  clearance. On 24 October 2026 the maintainer accepted the documented origin
  and confirmed that, to their knowledge, no additional external icon file or
  reference was supplied. The icon origin is now `maintainer-reported-ai`, its
  review is `reviewed`, and `icon-rights` is resolved within this bounded scope.
  This does not assert hand-drawn originality or complete rights clearance.
- `public/manifest.webmanifest` and `public/sw.js` are MIT-associated metadata
  or software under the existing guide. Their `not-applicable` review disposition
  means that the illustration/course gate does not apply to these two files;
  it is not an external-rights clearance or a whole-project review.

## Ledger schema and maintenance

Schema version 1 has exactly `schemaVersion`, `scope`, `groups`, `entries`, and
`blockers`. Scope is exactly `["src/content/", "public/"]`. Each entry has a
canonical relative POSIX `path`, lowercase `sha256`, and a `group` reference.
Optional `derivedFrom` and `generator` occur together; the generator is the
observed `scripts/setup-assets.mjs` pipeline. Derivation targets must exist in
the inventory and form an acyclic graph. Every group must be used.

Group categories are `course`, `asset`, or `software`. Origin records are
`maintainer-reported-ai`, `unresolved`, or `repository-software`. Review states
are `pending`, `reviewed`, or `not-applicable`; the last is restricted to the
software category with repository-software origin. Review evidence lists
repository-relative document references. Blockers contain a bounded identifier,
group, `open`/`resolved` state and a short reason. Every pending group needs an
open blocker; resolved blockers require a non-pending review disposition.
Unknown fields, versions and states fail closed. Evidence text and document
references are review records, not machine-verified permission grants.

When tracked files are added, removed or changed, inspect the exact diff and
review the affected scope before refreshing entries and hashes. Record known
copied/adapted inputs with their exact source, version, applicable license and
required notices in review documentation. Revisit concrete new copying/source
evidence under its actual license and reassess the affected group when new
inputs or findings change the basis of the recorded review. Preserve available
generation records and prior evidence privately. Do not include local
paths, private records, account data or copied prompts in this public ledger.
Only record a reviewed disposition after the underlying evidence supports it;
retain unresolved findings and document any limits. Hashes, credit, model output,
license filenames and output-ownership terms alone cannot clear rights.

The checker is read-only: a fixed `git ls-files -z -- src/content public` call
supplies coverage, then strict paths and all file components are checked before
selected content is read. It rejects symlink files/parents, path ambiguity,
case collisions, missing coverage, bad references and drift. It neither scans
arbitrary source paths nor runs learner code, Cargo, network requests, approval
or hash-update actions. Missing Git or unreadable input is a failure, never an
empty inventory. Diagnostics use bounded codes, counts and gate identifiers;
source bytes and raw filesystem errors are not printed. Run against a stable
local checkout; concurrent hostile filesystem replacement is outside this local
review tool's contract. A successful synthetic reviewed test fixture demonstrates
only the exit contract, never clearance of actual project material.

## Local performance investigation delta

The A7 delta adds assistant-authored Polish investigation prompts and worksheet
prose, a literal replay recipe, fixed Rust package fixtures, and test-only
historical projections derived from the genuine predecessor registry. Existing
Cargo manifest and lock bytes, archive notices and license assignments remain
unchanged. Criterion API usage is constrained to the existing dev-only 0.5.1
dependency; its maintained reference is linked from the investigation guide and
package material. No measured output is embedded in the learner worksheet.

The refreshed ledger records these source bytes and their reported generation
origin. The bounded source and technical reviews do not establish human
authorship, general originality, trademark clearance, learning efficacy, or
permission to publish. Concrete new external-source evidence still requires
assessment under the existing licensing guide. Private generation and execution
receipts remain outside the public source tree.
