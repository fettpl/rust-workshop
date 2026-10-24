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
privacy, CI status, or a visibility decision. The current project's expected
release result is **2**, with only `icon-rights` open. The completed bounded
course source assessment is recorded as reviewed, not exhaustive rights clearance.
Do not add that expected blocked result as an ordinary always-failing CI job.

## Current facts and unresolved review

- The course group records the maintainer's report of generation using ChatGPT
  and Codex from prompts and direction, with no manual drafting of fragments.
  The [bounded rights assessment](rights-assessment.md) inventories all 294
  course files and documents extracted-unit screening and contextual manual
  review. No actionable substantial copied-expression case was identified
  within that scope; `course-source-review` is resolved as that assessment
  record. Source citations remain leads, never automatic permission.
- The icon origin is traced assistant generation: private maintainer records
  show inline SVG construction with a successful receipt, followed by an
  assistant-reported palette change. Current PNGs reproduce byte-for-byte and
  pixel-for-pixel from the SVG using the measured sharp pipeline. This does
  not establish human authorship, historical tool versions or trademark
  clearance. `icon-rights` stays open for maintainer acceptance of the
  documented origin and any additional known external asset input; it does
  not require a false assertion of hand-drawn originality.
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
evidence under its actual license and complete the icon acceptance condition described in the assessment. Preserve
available generation records and prior evidence privately. Do not include local
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
