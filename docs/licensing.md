# Licensing guide

The maintainer approved the license split, project credit, and three existing
Cargo package exceptions on 23 October 2026. The approved project credit is
**Pixel Media Workshop Paweł Borawski**, starting in 2026. The current MIT notice
uses 2026; extend the year range when later-year contributions occur, rather
than asserting copyright in future work. This records the maintainer's choice,
not a determination that every AI-generated part is protected or rights-cleared.
The bounded source review and icon-origin acceptance are recorded in the
[rights assessment](rights-assessment.md); wider public-release checks remain
open. This is not permission to publish the repository. The project URL used in examples is
<https://github.com/fettpl/rustcrushcourse>.

## Two licenses with separate scopes

The repository does not offer a choice between MIT and CC BY 4.0 for the
whole repository. The approved split, limited to rights the project can grant, is:

| Material | License | Examples |
| --- | --- | --- |
| Software and executable material | MIT | application code, scripts, tests, evaluator machinery, schemas, identifiers, executable Rust, Cargo files, shell/TOML/JSON examples, programming examples, and generated archive code |
| Authored teaching material | CC BY 4.0 | lesson narrative, exercise prompts, hints, didactic solution text, answer prose, explanations, explanatory feedback, retrieval questions, and original course illustrations |
| Material received from elsewhere | The original license | dependencies, copied notices, referenced standards, and third-party assets |

[`LICENSE`](../LICENSE) contains the official MIT permission and disclaimer
text with the approved copyright notice. [`LICENSE-CONTENT`](../LICENSE-CONTENT)
is the unmodified generic CC BY 4.0 legal code. The project credit and scope
are supplied here; they do not replace the license terms or establish rights
in material belonging to someone else.

The scope above applies by material, not by a blanket directory rule. A
developer guide, README, AGENTS file, CI file, API reference, or other
documentation describing how the software works is MIT-associated
documentation. A pedagogical lesson or exercise explanation is CC BY 4.0.
When a file mixes both, mark the smallest practical regions and preserve the
split:

- Executable TypeScript/TSX, Rust, Cargo, shell, TOML, JSON, tests, evaluator
  fixtures, identifiers, schemas, and code inside a Markdown fence are MIT.
  `LessonStep.code`, executable `LessonStep.solution`, evaluator tests, and
  whole programming examples are MIT. Functional comments and program
  literal/output strings used by those examples are MIT as part of the
  executable example, even when stored in a content module.
- A string displayed as a lesson prompt, hint, explanatory paragraph,
  feedback, retrieval question, or answer prose is CC BY 4.0, even when it
  is a TypeScript value. A didactic paragraph outside the executable program
  remains CC BY 4.0; do not classify a runnable Rust literal or output string
  as CC BY merely because it appears in a lesson file.
- Functional comments about implementation, APIs, invariants, or tool
  boundaries follow the surrounding software and are MIT-associated. A
  comment that teaches a learner in paragraph form follows the teaching
  material and is CC BY 4.0. Do not put an ambiguous blanket license comment
  over a mixed file. For future mixed files, use a short, adjacent marker on
  each clearly delimited region and update this guide when a new pattern is
  introduced.
- `scripts/project-archive.ts` and other generators are MIT. The generated
  Rust and other executable project payloads are MIT; authored prose included
  in an archive remains CC BY 4.0. Generated files must carry the notices
  required by their inputs and must not be hand-edited.
- `public/manifest.webmanifest` and `public/sw.js` are MIT-associated code or
  metadata. The `public/icon.svg` and its PNG derivatives have a traced
  assistant-generated origin in the [bounded rights assessment](rights-assessment.md). The
  maintainer accepted that documented origin on 24 October 2026 and confirmed
  that, to their knowledge, no additional external icon file or reference was
  supplied. The existing acceptance condition is met; the approved CC BY 4.0
  illustration scope applies only to rights the project holds. This does not
  claim hand-drawn human authorship, training-data originality or trademark
  clearance. Any later identified external input retains its actual rights.
- Downloaded Rust code supplied by an external source keeps that source's
  license. A source citation identifies provenance; it does not grant
  permission to copy the source.

If a future file cannot be separated into these regions, stop and record the
ambiguity for maintainer review instead of applying one license to the whole
file or repository. Existing third-party rights are never acquired or
overridden by this project split.

## Existing authored Cargo package exception

Three existing authored teaching package manifests currently declare a narrow
package-level `MIT OR Apache-2.0` expression:

- `src/content/projects/mini-grep/archive.ts`;
- `src/content/projects/frame-protocol.ts`; and
- `src/content/projects/durable-log-service/archive.ts`.

The maintainer approved retaining this explicit existing exception. It
does not add an Apache option for the repository, the application, or all
course content, and it must not be used as a blanket `MIT OR Apache-2.0`
notice. [`LICENSE-APACHE`](../LICENSE-APACHE) contains the unmodified official
Apache 2.0 legal text as a reference for this package-specific option. The
remaining application and programming-example code stays MIT, teaching prose
stays CC BY 4.0, and external crates keep their own licenses and notices.

Preserve those exact manifest expressions and any applicable package notices
in both starter and solution archives. Do not edit historical content or
silently revoke a valid prior grant. Any future change needs a separate
maintainer decision and a check of copyright and contributor rights.

## Reuse and attribution

Under the approved MIT scope, people may use, copy, modify, publish,
distribute, sublicense, sell, and fork the software, subject to retaining the
MIT notice and permission text. The MIT text used here contains no express
patent grant. Under CC BY 4.0, people may share and adapt the licensed
teaching material, including commercially, subject to the CC BY attribution
conditions; CC BY does not license patents. CC BY requires an indication of
changes and does not permit implying endorsement. The Apache 2.0 contributor
patent terms apply only to code covered by the three existing package-level
`MIT OR Apache-2.0` declarations; they do not
extend to the application, course prose, or repository as a whole. The
relevant license text also does not grant trademark, privacy, publicity, or
moral-rights permissions beyond rights the licensor can grant.

For an adapted lesson covered by CC BY 4.0, use the approved project credit:

> Pixel Media Workshop Paweł Borawski, “<title or section>”,
> source <https://github.com/fettpl/rustcrushcourse>,
> licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Changes: [briefly describe the changes]. No endorsement is implied.

Keep the source URL, license link, supplied copyright notice, and required
change indication in a reasonable place for the medium. Do not add a
non-commercial, no-derivatives, CLA, assignment, or extra downstream
restriction to this package. A later license change does not revoke rights
properly granted under an earlier version, and the project cannot license
rights that belong to another author or dependency.

## Third-party material and distributions

[`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) records the current
dependency and generated-asset audit. Every external license and notice stays
effective. The dependency lockfile and each package's own notice are the
authoritative versioned inventory; this repository's MIT or CC BY text must
not be presented as a replacement for them.

For this milestone, the proposed release surface is the source repository,
authored Cargo project archives, and the public audit surface after the human
release decision. No hosted deployment, compiled browser application, `.next`
directory, or `node_modules` tree is being published. A Cargo lockfile names
registry inputs but does not by itself redistribute registry crate source.
Include a third-party notice when source, an asset, an example, or another
external work is actually copied or vendored into an archive; do not claim
that every registry crate or every production package is redistributed.

The setup script copies Monaco's browser assets from `monaco-editor` into the
ignored `public/monaco/` directory, including the upstream `LICENSE` and
`ThirdPartyNotices.txt` files. Those copied notices have been verified locally
for the current setup. If a future release serves or distributes a compiled
browser or other binary app, a clean build must identify the actual runtime
bundle and preserve the full applicable upstream license/notice text for each
copied package or asset; this index and SPDX metadata alone are not evidence
of browser compliance. The local Monaco copy does not repair project archive
packaging: the archive owner must separately include applicable notices and
resolve every local scope-document link inside the extracted archive before
claiming archive compliance. Do not relicense Monaco or its bundled
components.

When reusing this scope in a project archive, place `LICENSE`,
`LICENSE-CONTENT`, `LICENSE-APACHE` when the package exception applies, and
`THIRD-PARTY-NOTICES.md` beside the archive's scope document, or preserve a
directory layout whose links resolve to those entries. Check both starter and
solution archives after extraction. The generator keeps these notice links
local and turns links to the repository-only rights assessment and provenance
record into canonical repository URLs, preserving section fragments. These
URLs refer to the documents at their ordinary repository location; archive
checks do not prove that a local change has been merged or published.

Before the public-release gate, refresh the notice inventory after a clean locked
install, verify all tracked assets and downloaded project sources, and resolve
any unverified author or permission claim privately. Git history can preserve
contributor identity for audit; it must not be used to invent copyright
holders or rights for people whose permission has not been established.

## AI-generated material and provenance

The maintainer reports that the course was generated using ChatGPT and Codex
Desktop, with GPT-5.6 and later models doing drafting and research. The
maintainer supplied prompts and direction and reports no manual drafting of
course fragments. This is an origin disclosure, not a claim that every output
is original, human-authored, or free of third-party rights.

The approved licenses grant only rights the project can actually grant. A
copyright notice or project credit does not create copyright in otherwise
unprotected AI output. If a portion is not protected by applicable copyright
or similar rights, these licenses do not create an attribution obligation for
that portion. Protected human contributions, if any, must be assessed on their
facts; prompting alone is not treated here as proof of ownership of every
output. Preserve third-party notices and any applicable rights independently.

Current [OpenAI Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/)
assign OpenAI's rights, if any, in output to the user to the extent permitted
by law, but do not establish third-party clearance. The
[Codex service terms](https://openai.com/policies/service-terms/) expressly
recognize that generated code may carry third-party licenses. These current
terms are not a substitute for the account/workspace agreement and version
applicable when particular material was generated.

For provenance review, record known copied or adapted material with its exact
source, version, license and required notices. Research citations are useful
leads, not proof of copying or permission. Preserve available generation
records privately; neither automated similarity checks nor a model's account
of its training data can prove exhaustive clearance. The
[bounded rights assessment](rights-assessment.md) records the completed course
comparison and traced icon generation. The course review found no
actionable substantial copied-expression case within its stated scope; this
is not exhaustive clearance. The maintainer has met the icon acceptance
condition above without certifying human originality in generated geometry.
Do not ask contributors to certify that every model output is original
without supporting evidence.

## Remaining release gates

License selection and credit are approved. The bounded course source assessment
and icon-origin acceptance are recorded as reviewed; privacy remediation,
security reporting, dependency security, required CI, integration and human
publication remain separate gates. Resolve concrete copied-material or asset findings before including them in the public release. An unresolved
record is not cleared by the project's general license notice. See
[the release plan](https://github.com/fettpl/rustcrushcourse/blob/main/docs/oss-release.md) in the repository for the full sequence.

## Official sources and provenance

- MIT: <https://opensource.org/license/mit>
- CC BY 4.0 legal code: <https://creativecommons.org/licenses/by/4.0/legalcode.txt>
- Apache License 2.0 legal code: <https://www.apache.org/licenses/LICENSE-2.0.txt>
- SPDX MIT text provenance: <https://raw.githubusercontent.com/spdx/license-list-data/main/text/MIT.txt>

The reviewed official text files were retrieved on 22 October 2026. The CC BY
and Apache legal bodies must remain byte-for-byte identical to the reviewed
texts. The MIT permission and disclaimer body must remain unchanged, but
replacing its approved copyright placeholder necessarily changes the complete
`LICENSE` hash; record the final approved notice hash separately after the
human decision.
