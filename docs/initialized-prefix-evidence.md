# Initialized prefix: contract and evidence boundary

[Polski](initialized-prefix-evidence.pl.md)

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

At the 22 October recovery checkpoint, local validation passed the baseline
1,380-test unit suite without skips, all 2,519 authored Rust cases, content
validation (192 lessons, 194 concepts, 7 traces), and the production build.
The complete production browser suite passed 184/184 without skips, flaky
results, or retries. Offline checks preserved the initialized-prefix model,
primary task, draft, notes, help, and exact resume, while withholding compiler
credit when execution was unavailable. Follow-up qualification regressions
exercise stable version metadata and reject beta/nightly/dev release tokens.
Browser checks with intercepted runner responses establish UI/state behavior;
the separate trusted Rust fixture checks are compiler-backed.

The retained Native07 campaign passed stable and exact MSRV with 118 recipes,
125 commands, and 9 controls per mode. Its Miri attempt reached 122 recipes and
131 commands, exceeded the historical 480-second deadline, and retained ten
expected verdicts plus a category-mutator error. That attempt remains failed.
The category matcher is corrected. A subsequent Linux qualification failure
exposed a version check that scanned auxiliary Cargo metadata for prerelease
words; the check now validates the first release line while preserving exact
full-stdout and executable-hash qualification.

The later Linux Miri CI attempt failed before result upload because the hosted
runner worker itself ran out of space while writing its diagnostic log
(`System.IO.IOException: No space left on device`); this is a CI capacity
failure, not a native-proof acceptance result. The retained Native07 Miri tree
shows why the job needs headroom: one approximately 748 MB allocated original
was accompanied by eleven approximately 573 MB allocated tamper clones; their
logical sizes were approximately 699 MB for the original and 515 MB per clone.
Stable and MSRV retained approximately 59–60 MB logical originals and nine
approximately 60–62 MB logical clones each.
The dedicated `miri-safety` job therefore removes only the literal unused
Android and .NET SDK directories on the expected GitHub-hosted Ubuntu runner,
before Rust setup, and fails closed for any other environment or path shape.
After Miri sysroot setup it requires at least 20 GiB free on the workspace
filesystem before qualification and artifact capture. This is a capacity
preflight; it does not delete proof receipts, control inputs, toolchains,
caches, workspaces, or swap, and it does not alter the internal cooperative
deadline checks or the eleven-control proof contract. The original brief
imposed no 480-second operational requirement and
learner-facing limits are unaffected. The current `miri-safety` job corrects
the operational allowance to 60 minutes: stable retains 8 minutes, MSRV
retains 8 minutes, and Miri has a 30-minute total deadline for the full
capture and control campaign, including qualification, commands, controls, and
failure retention, for a 46-minute plan with 14 minutes of headroom. The
internal cooperative deadline checks and eleven-control proof contract remain
unchanged; any campaign beyond its deadline remains failed.
All prior Native07 and Linux CI failures remain failed historical results.
The later Linux trial reached the sixth of eleven controls at approximately
555 seconds before its cooperative deadline failure; it also remains failed
historical evidence. The measured setup interval in that trial was 2 minutes
03 seconds, from 02:09:09 to 02:11:12 UTC, and is part of the job headroom.
See the [GitHub-hosted runner
documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
and the [runner image disk-space discussion](https://github.com/actions/runner/issues/954)
for the hosted-image capacity context.

The subsequent capacity-preflight run retained approximately 27 GiB free after
sysroot setup. Stable strict verification passed with 118 recipes, but Miri
still aborted after capturing 122 recipes. Its sanitized summary did not identify
the abort stage, so this is not a passing native result or proof of a specific
abort cause. The next diagnostic revision maps the recorder's exact deadline
abort prefix to a fixed public code without exposing paths or raw messages.

The existing deadline is now checked before and after each tamper control.
The synchronous callback runs outside the control's error handler: an expired
budget aborts capture rather than becoming a control verdict. Completed control
packets remain durable, and success still requires the entire applicable control
inventory. These checkpoints detect overruns between controls; they do not
preempt a running synchronous operation or extend the budget. A separate,
observational CI probe compares JavaScript and native canonical-path resolution
on bounded qualified sysroot inputs and private temporary fixtures. It reports
finite status, counts, and timings only; neither resolver selection nor native
acceptance depends on that experiment.

The Linux probe subsequently completed 93 comparisons (81 qualified sysroot
inputs and 12 private fixtures) with no mismatches, including matching failures
for missing, broken, cyclic, and long-chain paths. Its bounded timings were
approximately 61 ms for JavaScript resolution and 30 ms for native resolution;
these are microbenchmark results, not a complete-proof speedup claim. The
reviewed Linux trial now tries the native resolver and retries the unchanged
JavaScript resolver on every native error. Other platforms retain JavaScript
resolution. Each call remains fresh; reads, hashes, confinement checks,
external snapshots, and complete control inventories remain unchanged. The
fallback also preserves the legacy handling of platform and symlink-depth
limitations described in the [Node.js filesystem documentation](https://nodejs.org/docs/latest-v22.x/api/fs.html#fsrealpathsyncnativepath-options).
That historical trial retained the 480-second mode deadline and remained
failed. The current operational job uses the 60-minute allowance described
above and still requires fresh strict CI acceptance. Deadline summaries
additionally expose only an allowlisted control ID and a before/after boundary,
or a fixed unavailable-stage marker.

A later Linux run with the explicit 30-minute Miri budget completed stable
strict verification and reached strict Miri control adjudication after about
17 minutes 25 seconds. Miri failed with `tamper-control-failed`; the native
MSRV invocation did not run. Completion within the budget is not acceptance.
The separate retained Native07 Miri diagnostic exposed a mutator defect:
a caret or help line mentioning Undefined Behavior prematurely ended category
replacement, leaving the later allocation note intact. The mutator now uses
the verifier's anchored semantic-error headers for block boundaries. Its
regression includes the complete help/allocation tail; verifier acceptance
and the required control inventory are unchanged. Fresh strict CI acceptance
is still required.

Failed semantic-control adjudication now exposes only a fixed control ID,
rejection boolean, expected reason code, and finite observed reason codes.
Known semantic and control-mechanism codes remain distinguishable; unknown
codes become `other`. This diagnostic seam deliberately covers semantic-control
failures only. Inventory, duplicate, unexpected, missing-control, and invalid
baseline failures retain their top-level reason codes without a new control
projection. Legacy failures without the seam do not imply a control ID. Raw
paths, messages, streams, hashes, and environment values remain private, and
all acceptance rules remain unchanged.

Full native acceptance requires the dedicated CI checks. Release acceptance
requires all eleven checks on the exact PR head and all eleven on the resulting
`main` commit; results are tracked in [PR 76](https://github.com/fettpl/rustcrushcourse/pull/76).

Availability counts describe authored content only: the expected source delta
is 1,273 to 1,275 steps, with the advanced provisional-family count moving from
four to three after actual integration. No claim about learner seniority,
completed future stages, educational efficacy, human pilots, hosting, or
readiness follows from this source cut.
