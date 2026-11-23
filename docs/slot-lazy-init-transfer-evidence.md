# Slot lazy initialization: contract and evidence boundary

[Polski](slot-lazy-init-transfer-evidence.pl.md)

Source checkpoint: 24 October 2026 (UTC). This is a separate local curriculum
feature after completed local OSS preparation. The maintainer authorized course
continuation while public release waits for Actions and its other external
gates. Local execution does not establish hosted CI acceptance, integration,
public release, learner achievement or universal memory safety.

## Distinct transfer contract

The existing `unsafe-miri-slot-state` lesson keeps its original step prefix and
appends `slot-state-lazy-init-model` and `slot-state-lazy-init-transfer`. The model
explains lazy initialization with a safe state representation and is exposure
only. The primary builds a separate `LazySlot<T>` transfer type, leaving the
old `Slot<T>` task unchanged. Its constructor is `new`, its ownership-transfer
method is `take`, and its new borrowed-access contract is:

```rust
fn get_or_try_init<E, F>(&mut self, init: F) -> Result<&mut T, E>
where
    F: FnOnce() -> Result<T, E>;
```

- A Full slot returns a mutable borrow of the resident value without invoking
  the initializer body. Captured values in the unused closure still drop
  normally; skipping its body is not a promise that dropping captures cannot
  panic.
- An Empty slot invokes the initializer once while its state remains Empty.
  An error returns that error and leaves the slot Empty. An unwinding initializer
  panic propagates; if the caller catches it, the slot remains Empty and may be
  retried. Earlier callback side effects are not rolled back.
- A successful initializer returns an owned value. Write that value before
  recording Full and before exposing its mutable borrow. The borrow cannot
  outlive the slot or coexist with a conflicting access to it.
- Taking a value transfers ownership and returns the slot to Empty. Dropping a
  Full slot drops its resident exactly once; dropping Empty does not treat
  storage as a live `T`. No additional Clone, static, Send or Unpin requirement
  is part of this API.

The old family covers eager `put`, moving `take`, and guarded destruction.
This family adds callback suppression, fallibility, unwind state, retry and
borrowed access. It is not another spelling of the old task or of the separate
ReplaceSlot replacement contract. The exercise accepts equivalent correct
behavior; passing does not identify a preferred internal implementation.

`catch_unwind` is used only in trusted tests of ordinary unwinding panics. It
is not general error handling, cannot catch aborting panics, and does not promise
recovery from a double panic during destruction. Teaching examples and tests do
not claim that arbitrary learner implementations are safe.

## Learning evidence and historical compatibility

The primary uses family `unsafe-miri/slot-lazy-init-v1`, evidence version 2 and
existing concept `unsafe-miri-slot-state-contract`. The old gate, equivalent
contract gate and blank task keep `unsafe-miri/slot-state-v1`; recall and review
remain separate retrieval. The new model and repeat submissions cannot create
an independent primary family. Global thresholds and the existing module
criterion's required independent task count are unchanged.

A predecessor snapshot is captured from the authentic pre-feature course. The
new test-only projection may remove only the two declared steps, their criterion
reference and explicitly reviewed metadata. Any downloadable-project restoration
must be guarded by its exact reviewed successor identity. Older projections
compose after this boundary; old frozen receipts and expected predecessor hashes
are not refreshed to conceal new changes. Unrelated changes remain visible.

V1/V2/V3 compatibility includes attempts, raw events and timestamps, assistance,
drafts, notes, bookmarks, review sessions, ratings, routes and exact resume.
Historical completion does not synthesize the appended task, upgrade a repeated
alias, or create independent credit. Revealing related solutions must not erase
previous clean raw events or launder subsequent assisted work.

## Required verification

Native witnesses cover initializer call counts, ordinary closure-capture cleanup,
error identity, retry after error or caught unwind, mutation through the result,
take/reuse, non-Clone and borrowed non-static values, and zero-sized Drop values.
Positive borrow clients accompany compile-negative owner escape and conflicting
borrow/lifetime clients. Behavioral rejection controls must fail their named
assertions rather than fail from missing tools, compilation or termination.

Only valid, fixed authored implementations and memory-safe semantic mutants may
run natively. Premature Full state, uninitialized reads and double destruction
are not authorized native negative tests. Any undefined-behavior fixture remains
metadata-only for ordinary compilation and selectable only by pinned Miri. Drop
counters are bounded observations, not a substitute for these safety rules.

The positive Slot integration witness belongs in the authored Miri Safety
archive and uses the actual MaybeUninit implementation. Existing stable/MSRV
all-target tests and pinned Miri discover integration tests; this describes test
selection, not an assertion that a particular command has run. Record exact
selected versions, target, source/archive hashes, commands and outcomes privately.
Focused Miri evidence is not acceptance of the entire historical Miri campaign.

Browser checks use controlled responses to establish family/assistance rules,
exact save/reload/resume, the 390px code tab and keyboard behavior. Warmed offline
checks cover draft/note/help/state durability and unavailable-runner feedback.
Those responses and offline study are not native compiler or retrieval credit.

## Provenance and source references

The new lesson material, trusted witnesses and tests are generated within the
maintainer-directed course workflow. Source references below support semantics;
they do not grant rights in copied expression or establish exhaustive originality.
No new external artwork or externally copied teaching passage is part of this
bounded feature. The existing MIT executable-code / CC BY 4.0 authored-prose split,
held-rights limits, project credit and narrow Cargo exceptions remain unchanged.
Inspect the actual diff and independently review the feature before refreshing
the scoped provenance ledger; new hashes alone are not a rights clearance.

- [MaybeUninit](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html): initialized
  value preconditions and manual drop responsibilities.
- [Exception safety](https://doc.rust-lang.org/nomicon/exception-safety.html):
  preserve unsafe invariants while user code can unwind.
- [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html):
  unwinding-only boundary and limitations.
- [Destructors](https://doc.rust-lang.org/reference/destructors.html): ordinary
  destruction and scope semantics.

The [local queue](local-development-queue.md) keeps MutSlot variance transfer and
foundation reconciliation as subsequent independent features. Full local results,
independent review and the English commit belong in the private handoff; fresh
required exact-head GitHub checks and resulting-main checks remain deferred.
