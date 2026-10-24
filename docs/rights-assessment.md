# Bounded course and icon rights assessment

This assessment records a bounded source/copying review of the course and a
traced origin for the project icon. It does not establish exclusive copyright in
every generated fragment, exhaustive third-party clearance, or permission to
publish. The approved [licensing split](licensing.md), project credit and three
Cargo exceptions remain unchanged and operate only on rights the project can
grant.

## Scope and evidence

The reviewed source base is `2aecc24d238f74a5e89d759fe4090fde3468d221`. The
finite ledger covers 294 tracked files under `src/content/` and five under
`public/`. The three icons are assessed below; the manifest and service worker
retain their software disposition. Private review receipts preserve file hashes,
extracted-unit coverage, comparison results, manual dispositions and the
relevant generation records. Private prompts, transcripts, account records and
machine paths are not part of this public document.

## Generated material and applicable rights

The maintainer reports that ChatGPT and Codex drafted and researched the course
from the maintainer's prompts and direction, with no manually drafted course
fragments. This identifies the workflow; it does not show that every output has
protectable human authorship or excludes third-party expression. Do not describe
the material as manually written or assert that every AI output is in the public
domain. Human creative selection, arrangement or editing, where evidenced, must
be assessed separately from the machine-generated expression.

The [OpenAI Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/),
observed as updated 16 January 2026, assign OpenAI's output rights, if any, to
the user to the extent permitted by law. This allocation between parties does
not establish copyright subsistence, exclusivity or third-party clearance. The
canonical [Service Terms](https://openai.com/policies/service-terms/) observed
on 24 October 2026 are updated 16 October 2026. Their Codex/code-generation
section recognizes possible third-party licenses. These current texts do not
reconstruct the agreement/version applicable to every generation. The [business
Services Agreement](https://openai.com/policies/services-agreement/), updated 1
December 2025 and effective 1 January 2026, is relevant only if that agreement
actually applied; an individual Pro subscription does not establish
business-agreement applicability.

The [Sharing and Publication
Policy](https://openai.com/policies/sharing-publication-policy/) observed as
updated 14 November 2022 supports accurate disclosure and responsible review.
Its API-specific provisions do not establish that this course used the API or
justify an inaccurate claim of human rewriting.

Polish copyright law distinguishes individual creative expression from ideas,
procedures and principles; adaptations preserve underlying rights and creative
selection or arrangement may be protected separately. See the [official
consolidated Act](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf),
especially Articles 1–3, 8 and 74 (Dz.U. 2025 poz. 24; the consolidation's
stated legal position is 3 December 2024). This is a general statutory
framework, not a ruling on the course. The CJEU's [Painer judgment,
C-145/10](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A62010CJ0145),
paragraphs 87–94, connects originality to free creative choices and personal
touch in its photographic context; applying that reasoning to prompting is an
inference, not an AI-specific holding.

Under the approved MIT/CC BY 4.0 split, the project grants only rights it holds.
The [CC BY 4.0 legal
code](https://creativecommons.org/licenses/by/4.0/legalcode.en) neither creates
copyright in unprotected material nor removes existing third-party obligations.
Project credit does not create authorship or make a citation a permission grant.

## Course comparison and disposition

All 294 tracked course files were inventoried by SHA256 and first-introduction
Git metadata. The static comparison screened 27,883 extracted local units
against 7,492 public upstream units containing 4,671,689 tokens. It produced 244
candidate records at 52 distinct local syntax anchors; these are comparison
leads, not 244 copying findings. Sixteen contextual manual cases covered the
candidate classes and selected prose/code regions.

The source-object inventory contains 301 distinct URLs including historical
records. Separately, the cited-page fetch retrieved 275 of 277 distinct public
pages after fragment deduplication and exclusion of project self-references. Two
rust-fuzz GitHub paths returned 404. A speculative Rust-blog license path also
returned 404, so no general blog reproduction permission was established. A
source citation or a successful fetch is not a license grant.

Retrieved repository snapshots and their verified license basis were:

| Upstream repository | Retrieved commit | License basis |
| --- | --- | --- |
| [Rust Book](https://github.com/rust-lang/book) | `1500248d8f230566e4ec9f27fcbb8fe9e2898ab1` | MIT OR Apache-2.0 |
| [Rust by Example](https://github.com/rust-lang/rust-by-example) | `dcc14f912bf8790792a2df082eddc82ab2539229` | MIT OR Apache-2.0 |
| [Rustonomicon](https://github.com/rust-lang/nomicon) | `b0bb569883a3e65ab19d4f1adf1b8dbc1629d0a6` | MIT OR Apache-2.0 |
| [Rust Reference](https://github.com/rust-lang/reference) | `3989fe91f1a601b51684a582ad17b2503f221787` | MIT OR Apache-2.0 |
| [Tokio website](https://github.com/tokio-rs/website) | `71cdb3858fbb943843e8cf0e8baf547fe22180f7` | MIT |
| [Tokio](https://github.com/tokio-rs/tokio) | `8a2408edcfa2b7f19c00428a9d3a8ea6652a083f` | MIT |

These are current retrieved snapshots, not proven inputs to historical
generation. Versioned Tokio documentation links at 1.53.1 and 1.54.1 remain
distinct. Upstream holders and notices remain their own; this table does not
substitute project credit or license every cited page.

| Reviewed cluster | Contextual result |
| --- | --- |
| Ownership, traits, collections, Rc/Weak, variance and Polish explanations | Shared Rust semantics; no substantial distinctive listing or translated expressive passage identified in the selected regions. |
| Mini-grep and guessing-game package definitions | Shared project ideas; reviewed local program structure, constraints, outputs and tests differ from the Book examples. No substantial listing adaptation identified. |
| Cons/Box recursion, counting Wake callbacks and GAT trait signature | Real short expression parallels, including a 32-token Cons fragment, 53–54-token Wake observer and 36-token GAT signature. Their constrained/conventional form and surrounding context did not establish actionable substantial copying; actual historical derivation remains unknown. Shortness alone is not a clearance rule. |
| AsyncWrite/Stream/Future methods, API snapshots and diagnostics | Matches include required signatures, trivial bodies and emitted diagnostic scaffolding. The longest code candidate was 92 tokens; surrounding custom behavior was not reproduced. No mandatory missing-notice case established. |
| Tokio service/cancellation prose and initialized-memory examples | Reviewed local framing/state/safety contracts differ from upstream examples; no extensive distinctive listing, prose quotation or translated expressive passage confirmed. |

If a concrete adapted source is later identified, retain its actual license and
required notices in the affected region and distributions. For example, an
established Rust documentation or Tokio adaptation may require its upstream MIT
copyright/permission/disclaimer; the project CC BY credit cannot replace it. Do
not invent attribution to one of several plausible sources merely because a
conventional fragment matches. Larger reuse of the Rust blog requires
determining actual permission first.

The course source review is **reviewed**, with **no identified actionable
substantial copied-expression finding within this bounded scope**. The ledger's
`course-source-review` is resolved as a record of this completed assessment, not
exhaustive legal clearance or a warranty of originality. No course or
public-asset bytes were changed.

### Coverage limits

All files were inventoried, but the compared units are extracted string/template
literals of at least 40 characters, static interpolation fragments and selected
all-literal arrays. Arbitrary runtime concatenation/composition was not
executed. An independent recursive JSON extraction control confirmed coverage of
all 12,317 string values at least 40 characters across the 14 JSON files; that
does not cover shorter values or establish semantic clearance.

The exact matcher uses 24-token shingles, upstream stride 4, at most four
upstream occurrences per shingle and eight hits per local unit, retaining
matches of at least 30 tokens. A secondary normalized screen covered 747
qualifying Book Rust listings and RBE/Nomicon snippets of 50–2,500 normalized
tokens; selected local code units of 80–6,000 tokens excluded test paths and the
fixtures directory. It used stride-4 16-token fingerprints, top-three candidate
pairs, at least five fingerprints, a contiguous match of at least 65 tokens and
at least 50% of the shorter unit. It produced no leads at those thresholds.
Neither screen comprehensively detects renamed, translated, reshuffled or
shorter borrowing.

Manual Polish/English translation review was limited to the stated
regions/clusters and candidate triage, not every paragraph or executable
behavior. This was not an internet-wide or commercial similarity search. Current
snapshots and course review dates do not reconstruct all generation-time inputs.
Git chronology is evidence of introduction, not human authorship; deleted
historical blobs were not all screened. Archive definitions and starter/solution
literals were inspected statically; generated archive packaging/notices and
executable correctness remain separate checks. No private snippets or assets
were sent to external search services.

## Icon origin and maintainer acceptance

Private maintainer generation records show an assistant writing the complete
three-shape SVG inline and a successful execution receipt. The initial design
has exactly the current geometry. A later assistant report describes changing
the palette to blue/white and regenerating PNGs; the current SVG equals the
first SVG with only those two color substitutions. The palette step is supported
by that report and exact byte relationship, rather than an independently
reviewed execution receipt for the recolor. The original supplied product
specification and pre-write human input identify no external icon, artwork URL
or image reference.

All three current icon assets first appear in repository Git history at
`b3de96660ba60fe9fa77354c549a5b5dedc44bbb` and have not changed across the
available shared reachable history. The 257-byte SVG uses a blue rounded
rectangle, a white lowercase-r path and white dot; it imports no font, external
image, linked resource or embedded raster. Git identity alone would not
establish authorship; here the inline generation record supplies additional
evidence.

The pipeline in `scripts/setup-assets.mjs` reproduces both committed 192×192 and
512×512 PNGs byte-for-byte and as decoded RGBA pixels, including repeated
rendering, using Node 22.23.4, sharp 0.35.5 and libvips 8.18.7. Historical
lockfile versions establish declared dependencies, not the original execution
environment; reproducibility across all historical tools/platforms is not
claimed.

Local comparison with the official Rust, Cargo and Rust Foundation logos
identifies no incorporated official logo or concrete external asset source. The
[Rust trademark
policy](https://rustfoundation.org/policy/rust-trademark-policy/) separates CC
BY artwork permissions from marks and prohibits misleading official affiliation
or endorsement. The [Foundation brand
guide](https://rustfoundation.org/brand-guide/) supplies the official comparison
designs. A different image is not comprehensive trademark clearance: the Rust
Workshop name and overall presentation must still avoid confusion, and no global
trademark-register search was performed.

The supported origin is traced assistant-generated project artwork with PNG
derivatives. On 24 October 2026 the maintainer explicitly accepted this
documented origin and confirmed that, to their knowledge, no additional
external icon file or reference had been supplied. This meets the existing
maintainer acceptance condition: the icon review is recorded as reviewed and
`icon-rights` is resolved within this bounded scope. The previously approved
CC BY 4.0 illustration scope applies only to rights the project holds; no new
license selection or artwork is introduced. The confirmation does not claim
hand-drawn authorship, prove training-data originality, clear all third-party
rights or authorize publication. Reassess any concrete external input or
rights finding identified later.

## Review disposition and release boundary

The course disposition must be read with its comparison scope and residual
limitations above. An assessed source group is not a warranty covering every
possible external source or all rights. Icon acceptance is recorded above; both
scoped provenance blockers are resolved, without closing wider release gates.
Structural/hash agreement, legal assessment, dependency/security/privacy review,
exact-head CI, integration and the human visibility decision are distinct. This
assessment changes no source bytes, third-party terms, publication authorization
or existing downstream rights.
