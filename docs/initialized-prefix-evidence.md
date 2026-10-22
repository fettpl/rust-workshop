# Initialized prefix: contract and evidence boundary

The initialized-prefix lesson extends the existing `unsafe-miri-byte-view`
lesson. It introduces the maintained `unsafe-miri/initialized-prefix-v1`
family through two appended steps:

1. `byte-view-initialized-prefix-model` is a runnable, two-byte model. It
   demonstrates writing `0` and `255` with `MaybeUninit::write`, publishing the
   initialized length, and printing `[0, 255]`. It is exposure only.
2. `byte-view-initialized-prefix` is the primary transfer task. Its frozen
   contract is:

   ```rust
   use std::mem::MaybeUninit;
   #[derive(Debug, PartialEq, Eq)]
   pub struct TooLong;
   pub fn fill_prefix<'dst>(
       dst: &'dst mut [MaybeUninit<u8>],
       src: &[u8],
   ) -> Result<&'dst [u8], TooLong>;
   ```

   A source longer than the destination returns `Err(TooLong)` before any
   write. Otherwise every source byte is copied into the exact destination
   prefix and the returned borrow points into the destination. The suffix is
   preserved and never read, including when it is still uninitialized. Empty,
   exact-capacity, partial-capacity, and arbitrary non-UTF-8 inputs are valid.
   The source may end before the returned borrow is used; the destination must
   remain alive. `u8` has no `Drop` obligation. The starter is safe and returns
   `Err(TooLong)` unconditionally; no undefined-behavior snippet is presented
   as a learner starter, model, solution, or generic extraction.

The model introduces `MaybeUninit::write` and initialized-length reasoning for
the two-byte example. The authored lesson and contract text carry the full
raw-slice conditions; the model itself is exposure-only. It explains that
`MaybeUninit::write` establishes initialized elements,
that the initialized length is the only readable prefix, and that a final
`slice::from_raw_parts` conversion requires an exact non-null, aligned,
initialized range in a live allocation. For length zero, no address is read;
the permitted empty slice has its own non-null/alignment rules. The lesson does
not add a future `Slot` prerequisite and does not change the existing source
registry or prerequisite graph.

The narrow historical fixture
`src/content/fixtures/unsafe-miri-pre-prefix.json` is copied byte-for-byte
from the accepted pre-prefix capture. The support projection removes exactly
the two appended steps and the new primary task reference from
`unsafe-miri-byte-view-gate`; it does not rewrite old steps, sources, lesson or
module metadata, reviews, or saved learner state. Synthetic V1/V2/V3 builders
exercise seven completed historical steps, ordered contact history beyond 24
events, drafts, help/reveal state, notes, review sessions, ratings, export,
import, and reload. They are labeled synthetic evidence and are not learner
observations.

The authored browser and offline scenarios are state/UI checks designed to verify the
primary heading, draft, note, help, resume location, durable IndexedDB writes,
the model and primary lesson panels at a 390px viewport, no horizontal
overflow, and explicit editor Tab/Shift+Tab focus behavior. Event assertions
scope exact lesson, step, transfer, and test predicates. Offline execution
keeps the draft and note and reports runner unavailability; it cannot establish
Rust correctness or independent coding credit.

The accepted private feasibility source is a design input only. It differs from
the authored source and does not count as fresh product evidence. The 16 October
record attributes 358 recipe records, 381 commands, and a 358/358 read-only
production-interpreter audit to the historical capture. Its raw receipts are no
longer retained for fresh verification; these figures are historical attribution,
not a current retained-data or strict-proof claim.

At the 22 October development-branch checkpoint, the source/proof and
canonical synthetic-write reviews are complete. All three scoped synthetic
callbacks pass. Inspection of 20 result packets confirms exact nine/eleven
control inventories, valid original and copied baselines, exact intended finite
reason-code sets, and unchanged original/external bytes. These callbacks use
synthetic fixtures, not native Rust behavior. Native07 stable strict passed with
118 recipes, 125 commands, and 9 controls; MSRV strict passed with the same
118/125/9 counts. Miri reached 122 recipes and 131 commands but exceeded the
unchanged 480-second deadline, leaving 10 expected verdicts plus a
category-mutator error and no native acceptance. A narrow category-only
correction is regression-tested by 78 focused tests in both the private harness and the
canonical repository. No native realpath optimization or memoization is included.
Full tests, build, UI/offline, CI, final branch review, and release acceptance
remain pending. The source is a development branch under validation; a draft PR
is upcoming.

Availability counts describe authored content only: the expected source delta
is 1,273 to 1,275 steps, with the advanced provisional-family count moving from
four to three after actual integration. No claim about learner seniority,
completed future stages, educational efficacy, human pilots, hosting, or
readiness follows from this source cut.
