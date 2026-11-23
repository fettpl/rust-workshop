# Durable Log Service capacity change and review

[Polski](capstone-change-review.pl.md)

The M10 extension makes the existing per-stream K problem executable as local
Rust engineering practice, then asks the learner to revise it after review.
It follows the [6 October portfolio and practice priorities](curriculum-review-2026-10-06.md)
and the [8 October learner-owned project bridge priority](curriculum-review-2026-10-08.md).
The earlier problem-only K prompt remains part of the same capstone; the new
material adds a worksheet, a persisted capacity-change scenario and trusted
reference verification. It adds no lesson, evidence family or application state.

## Reference behavior and compatibility

The author reference offers the additive
`Store::open_with_stream_limit(path, max_events, per_stream_limit)` constructor,
with a positive `NonZeroUsize` limit and `Event.source` defining the stream.
Admission counts committed rows within the transaction after existing identity
resolution. Identical retries preserve their original receipts; changed payload
or correlation still conflicts; a new identity at capacity returns `Full`
without a row or success receipt. The global limit remains an independent bound.

`Store::open(path, max_events)` remains global-only. The service Config, client
protocol and default service behavior are unchanged: the default service does
not enable per-stream K. Reconfiguration closes and reopens the store with a
new K. The reference tests commit two rows under K=2, reopen under K=1 without
deletion, then reopen under K=3 and admit exactly one further row. They check
receipts, conflict precedence, another source, global capacity, restart and
bounded storage failures. Store proof does not prove a learner's client–service
integration or stronger concurrent-client or multi-process behavior.

## Learner artifact and review

Both downloadable variants contain the Polish `CHANGE-REVIEW.md` worksheet.
The starter asks for the problem and observations without supplying the new
constructor, SQL, internal types or architecture. Learners identify their own
source versions and toolchain, compare two designs, retain an actual failed
command and correction, link regression tests and complete an observation
matrix. The later K=2 → K=1 → K=3 stage follows review of the first version.

The follow-up and solution are public. A collapsed card does not make the task
unseen; the worksheet records prior exposure and help. Self-report, another
person's source review and observation of work are separate records. Reference
code belongs to the course author, and the learner must test their own complete
client–service–store path. Downloads, worksheet entries and external Cargo runs
award no completion, mastery, independent-family or review-queue credit. Normal
solution viewing continues to record its established assistance transition.

## Maintainer verification

Run the repository checks against the current source; these commands are a
verification recipe, not a record that a learner ran them:

```sh
npm run test -- src/content/projects/durable-log-service/package.test.ts src/content/capstone-integration-integration.test.ts src/content/capstone-verification.test.ts
npm run content:capstone
npm run content:capstone -- --msrv
npm run build
```

The restricted capstone verifier extracts only the repository-authored archive,
checks archive/source and manifest relationships and runs the reference on
stable and exact Rust 1.85.0. Its 13 controlled mutants include per-stream
accounting, identity precedence, persisted occupancy, lower-K deletion and false
success. A mutant must compile and fail its designated behavioral test; restored
reference execution must pass. Compilation, timeout and infrastructure failures
remain distinct outcomes. No learner path, uploaded source or arbitrary workspace
is accepted. Production browser checks and the offline verifier separately
exercise worksheet access, both ZIP variants and preserved local learning state;
browser runner interceptions are UI evidence, not Rust execution.

## Remaining evidence limits

No learner-owned artifact review, human beginner pilot, delayed unseen transfer
or manual accessibility result is established by these author fixtures. The
eight advanced single-family concepts remain provisional: async callback,
cancellation/commit, Send, dyn adapter, ByteView, disjoint regions, Slot and
MutSlot. Receiver pairing and existing unsafe-family/retrieval limitations are
unchanged. This extension enables practice; it does not establish professional
or senior readiness or educational efficacy. The dated October reviews retain
their original findings and source identities.
