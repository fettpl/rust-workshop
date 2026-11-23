# Advanced continuation — 15 October 2026 source checkpoint

[Polski](2026-10-15-advanced-continuation.pl.md)

The accepted maintenance base is ordinary main `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`, tree `7638d5f7a07ca24907a15edec7ea7d3627496d18`. The coordinator verified [main run 38733773185](https://github.com/fettpl/rustcrushcourse/actions/runs/38733773185), attempt 1, with all eleven jobs successful before implementation began. This document publishes the independently reviewed Astra requirements and frozen A1 design (SHA256 `047025c8eac852c591b8afb3edee3ba3028b763a3fd6f100c833ba437a16006b`). A1 source is in development; its combined local checks, exact-head review, PR, ordinary merge and resulting-main evidence remain separate acceptance gates. No A1 release identity is claimed.

The current authored A1 registry has 48 modules, 192 lessons, 194 concepts, 1,271 steps and 349 sources. The addition appends only a prediction/model and one primary `prepare_handoff` task inside the existing Send lesson. The original five steps, gate/blank family and recall remain unchanged. Four of the nine calibrated advanced concepts now have two authored primary families; cancellation/commit and the four Miri concepts remain single-family. These counts establish availability, not learner outcomes.

The requirements and design below retain their source-bound planning scope. Later milestones require fresh bounded design and release gates after A1; no later implementation is included here. Human pilot, hosting and demonstrated professional seniority are not authored-development gates or delivered results.

## Intent and authority

Continue the authored course for an experienced mid-level practitioner progressing toward senior-relevant work, preserving the original beginner route. Deliver successive bounded, reviewed, tested and ordinarily merged milestones. This is a broader resumed objective: the completed October finite baseline plus PR65/66 does not close it. Polish learner material; English engineering reports and PRs. Human pilot, hosting and demonstrated personal seniority are not development gates. Neither green software nor authored availability establishes learner competence.

This is architectural scope planning with a bounded first feature. Brainstorming and writing-plans informed decomposition and handoff; this packet is a design/requirements inventory, not executable implementation code. Parent owns execution authorization and release gates. No source edits, Git changes, installs, builds, runtimes or delegated implementers were used here. The original Astra review wrote only its private planning artifact; this repository document publishes that frozen scope with the current source/release attribution above.

## Source cut and attribution

Directly inspected worktree: `<maintainer-home>/.codex/worktrees/workspace-fallback-oct7/rustcrushcourse`.
HEAD `a851055afd1caa8298e6763d6b306bd3ce00f579`; tree `7638d5f7a07ca24907a15edec7ea7d3627496d18`.
This planning source tree was subsequently accepted in maintenance PR67 as ordinary main `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`; the coordinator confirmed all eleven resulting-main checks before A1 implementation. The inspected maintenance HEAD remains its original attribution.

Direct reads: original attached brief; current `docs/curriculum-audit-2026-10-10.md`; relevant October6 review; `docs/advanced-curriculum.md` target scope; `docs/capstone-change-review.md`; `src/engine/course-route.ts`; `src/content/course.ts` roadmap; async lending boundary/core/module/callback/fixture/compatibility source; evidence policy in `src/engine/learning.ts`; package scripts. Historical audit table is a delegated audit result with stated original attribution, not my independent reread of all 192 lesson bodies. The finite final reconciliation at `<private-temp>/receipt-012/review-astra/40-final-finite-course-stage-reconciliation.md` supplies completed release evidence, not new execution by this reviewer.

SHA256 at inspected cut:
- `docs/curriculum-audit-2026-10-10.md`: `87f94211793f57f5eab88a507091fc9d3d13ba837f32f2aa98a36f21392d0498`
- `src/content/async-lending-boundaries.ts`: `019aba80d2d31a602a1ab70fbd5ed89967c7000dfbde08361e97e4ce4ab7d970`
- `src/content/async-lending-module.ts`: `42d43e5b0c7304daa331545fc91c98eb2741a6036db71e9e2b6102c7562b6764`
- `src/engine/learning.ts`: `7428d5193e7de19f0b7f0533c83a2d7095b8be24accb86f5a9fadacf0a23802b`

Baseline inventory from final finite report: 48 modules, 192 lessons, 194 concepts, 1269 steps, 349 sources. These counts describe availability. Core17 has 73 lessons; Mini grep and the support/thread chain yield 92 recommended lessons before Study Session CLI. Do not turn all extensions into mandatory beginner prerequisites.

## Broader requirements inventory

Status means authored/software coverage, never observed learner success. Covered means the named bounded requirement exists; partial means a concrete evidence or transfer dimension remains. Missing applies to the stated artifact, not an entire topic. Target-map historical pending statements must be reconciled against later source, not repeated as current defects.

| Requirement | Current status and evidence | Remaining development acceptance |
| --- | --- | --- |
| Beginner-to-advanced prerequisite spine | Covered beginner route and thematic extension discovery, `course-route.ts`; advanced modules have prerequisites | Partial advanced navigation: publish ordered capability milestones and prerequisites without treating thematic groups or recommendation order as readiness |
| Ordinary ownership/borrowing/error/iterator fluency | Covered authored foundations and October baseline/composition/docs repairs | Four calibrated ownership concepts remain provisional. Repair has one family; stack/heap, scope/drop, Copy have zero coding families. Choose valid observable contracts; do not relabel traces as code evidence |
| Generics/traits/lifetimes/HRTB/GAT/dyn | Substantive existing branches and two-family callback/receiver/dyn transfer | Partial cross-project architecture decisions: compare generic and dyn approaches, costs, lifetime constraints and change consequences in learner-owned artifact |
| Async tasks/cancellation/backpressure/shutdown | Extensive actual Tokio/service packages and bounded browser models | Cancellation/commit and Send retain one primary family each. Close those with genuinely distinct contracts and runtime/compiler witnesses |
| Threads/Send/Sync/atomics/order/Loom | Existing threads and Loom laboratory | Synthesis must ask for invariant/order justification and a bounded adverse execution, explicitly separating stress, model exploration and proof |
| Unsafe initialization/lifetimes/disjointness/drop/variance | Existing FFI, Miri, borrowed-memory source and native packets | Four calibrated Miri concepts remain single-family. Supply independent invariant-focused transfer with compile-negative clients or Miri diagnostics appropriate to each; no universal soundness claim |
| Public API/SemVer/errors/workspaces/features/MSRV | Existing API client, release matrix, typed errors and dependency lifecycle | Independent changed-client engineering exercise and public contract/error/rustdoc/release rationale; classification of the same finite rule alone is insufficient |
| Macros as public APIs | Existing exactly-once/grammar/hygiene/Rust2024 consumer fixture | Covered bounded declarative macro scope; retain downstream-client regression and document unsupported grammar/expansion. Proc-macro ecosystem is not automatically a missing requirement |
| Supply chain/security/trust boundaries | Existing dependency assurance snapshots and capstone/service contracts | Partial artifact provenance and threat-model synthesis. Live advisory/publishing infrastructure remains explicitly separate; author reproducible local dossier and failure/expiry cases before any external operation |
| Property/fuzz/Miri/Loom selection | Existing practical tools and independent oracles | Partial cross-system risk selection: learner must choose tool, construct counterexample/replay and explain limits; runtime packets must support the advertised local exercise |
| Benchmark/profile/allocation | Existing actual profiler/allocation packets and models | Partial independent changed-workload investigation: hypothesis, comparable measurement, retained failure and justified decision. Repeating browser classifier does not operate profiler |
| Architecture/observability/operations | Service operations plus durable capstone and public K-change worksheet | Partial open integrated maintenance lifecycle: ADR alternatives, error boundaries, bounded admission, correlation, runbook and fault/recovery drill; self-review and observed external review stay separate |
| Code review and response | K-change worksheet and rationale affordances | Partial two-stage review practice: author inspectable alternative patches, contract-based comments, response/disposition and regression evidence; actual human reviews not mandatory to ship authored material |
| Open portfolio synthesis | Study Session and advanced Durable Log Service exist | Partial advanced complete packet linking API evolution, bounded lifecycle, security, performance and incident changes without prescribing internal types. Public follow-ups must never be called guaranteed unseen |
| Compatibility and honest evidence | Existing historical projections, raw assistance/history, versioned family policy | Every milestone preserves all old lesson-qualified step indices/IDs, raw evidence and saved locations; no retroactive primary credit or inflated completion |

This inventory preserves every senior-scope row of `docs/advanced-curriculum.md` (API, Cargo, abstractions, iterators, smart pointers, concurrency, async, error design, testing tools, performance, unsafe/FFI, architecture/observability, security/operations, review). It is not a promise to add every possible Rust specialization. Completion requires resolving each listed partial through authored deliverables or a source-grounded explicit scope decision, not merely adding headings.

## Ordered milestones

Each row is a separate reviewable PR, with full local checks, exact-head review, ordinary merge and eleven main checks before the next source feature starts. Larger rows must split when concrete design exceeds one bounded contract.

1. **A1 Send suspension and owned handoff** (detailed below): close one demonstrable advanced calibrated gap.
2. **A2 Cancellation retry/commit transfer**: new retryable unit with real Pending, callback failure and persistent pre-cancellation effects; compare acknowledged progress with attempted work. Must differ materially from current Cursor/EffectFuture and callback batch, not merely rename them. Review a contract-difference matrix before coding.
3. **A3/A4 Unsafe transfer pairs**: first initialized borrowed view + disjoint regions, then MaybeUninit ownership/drop state + mutable variance. Pair only if native fixtures/ownership remain independently reviewable; otherwise four PRs. Preserve existing unsafe support boundaries and use actual relevant native/Miri witnesses.
4. **A5 Foundational evidence reconciliation**: independent ownership repair family, then valid scope/drop and Copy behavior contracts. Stack/heap conceptual knowledge may require a deliberately revised future evidence design; do not award coding-family credit for physical-layout guesses. This is not a reason to stall all advanced work or weaken the global threshold.
5. **A6 Library maintenance synthesis**: changed downstream client with public error/API/feature/MSRV obligations, documentation, macro boundary where relevant, ADR and release dossier. Use existing Frame Protocol; no registry publication required.
6. **A7 Performance and test-strategy investigation**: changed workload on existing project, independent hypothesis and tool choice, real bounded measurements/counterexample/replay, comparison and regression decision. Do not duplicate finite classifiers.
7. **A8 Service/operations maintenance synthesis**: extend the existing open capstone packet with a contract-based change plus diagnosis/recovery exercise tying admission, cancellation, durable state, observability and trust boundaries. Retain architecture freedom and own tests. A1/A2 and A6/A7 feed this.
8. **A9 Final advanced reconciliation**: all target rows mapped to current authored artifacts; discoverable recommended advanced route; prerequisite and coverage tests; current source-bound verification snapshot and explicit remaining external/learning limits. Reaudit each row instead of marking all green because CI passed.

A6–A8 require fresh bounded design against then-current source; they are ordered requirements, not permission to invent unchecked APIs now. Human pilot, deployment, live security operations, learner employment/seniority and universal correctness remain outside authored-development closure.

## Alternatives and selection

Adding another advanced module would increase breadth where the audit already finds substantive coverage. Expanding open capstone first is valuable but would compose known weak calibration and delay a clean, independently verifiable improvement. Completing all conceptual ownership labels first risks manufacturing inappropriate executable proof for stack/heap. Select A1: a direct, narrow advanced gap with strong compiler and runtime observability, then progressively integrate.

## A1 bounded design: local preparation versus suspended task state

**Objective:** learner separates a non-Send preparation context from a Send+'static future, predicts what is retained before/through suspension, and proves the owned handoff works after the local context has been dropped.

**Prerequisites:** existing Send boundary lesson, callback borrowing, Future/Pending, ownership, task spawning. The new task is appended inside `async-lending-send-boundary`; no new module, concept, lesson or beginner requirement. Existing lesson step prefix remains immutable. Add a short prediction/model step followed by one independent transfer task, with optional session stop if lesson duration grows. Existing 18-minute estimates remain provisional.

**Domain:** a local formatter turns borrowed input records into owned report lines before a worker waits for permission to deliver them. The formatter may capture `Rc<RefCell<_>>`, local references and a call log. Only owned output and a Send pause future cross the task boundary.

**Public executable contract:**

```rust
pub fn prepare_handoff<F, P>(records: &[String], format: F, pause: P)
    -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<String>> + Send + 'static>>
where
    F: FnMut(&str) -> String,
    P: std::future::Future<Output = ()> + Send + 'static;
```

Calling `prepare_handoff` synchronously invokes `format` exactly once for each record, in order, retaining its returned owned strings unchanged (including Unicode, empty strings and duplicates). It invokes no callback for zero records, but the returned future must still honor pause: zero records with a Pending pause remains Pending until pause is Ready, then returns an empty vector. It returns an owned boxed future. Polling that future polls the supplied `pause`; while pause is Pending, it must not complete. Once pause is Ready, output is the prepared strings in order. It must not rerun formatting on repeated Pending polls or after readiness. Caller may drop input and formatter captures before polling/spawning. Dropping an unpolled or Pending returned future discards owned outputs but cannot undo the already recorded formatting effects. No promise to repoll after Ready. Do not promise allocation-free behavior: boxing and owned strings are explicit costs.

The signature intentionally does **not** require F: Send, F: 'static or records: 'static. A boxed future states the dynamic allocation boundary explicitly and avoids making Rust2024 opaque capture syntax the hidden objective. A representation-diverse valid implementation may use a loop, map/collect, helper state struct or an async block. No source spelling check should reject one merely for differing from reference.

**Why this is a second family:** the existing `owned_report(Vec<u8>)` immediately returns an owned report and asserts a bound. This contract instead must establish synchronous callback timing, exclude local non-Send/borrowed capture from future storage, retain transformed output through actual Pending, and be reusable after owners disappear. Neither existing owned_report nor renaming its bytes/result can pass. This is one new family, not several families for each test or native witness.

Suggested family `async-lending/send-prepared-handoff-v1`, exact concept attribution only `async-lending-send-boundary`, evidence version 2. The task is a constrained public-API implementation, not unrestricted architectural blank-page evidence. Existing old gate/blank remain one family; existing review remains separate and cannot count as another primary family. Module completion stays one independent contract per criterion; concept confirmation still requires two clean eligible families. Update exit copy to four two-family async concepts and cancellation single-family, without implying learner-earned confirmation.

**Theory/practice sequence:** predict whether the callback effect occurs at construction or first poll; contrast an async body that retains F with synchronous preparation outside that body; explain that async move does not make Rc Send, Send does not imply 'static, and a completed local scope can be absent from suspended state; implement handoff; test Pending/drop and owned output; inspect real compiler messages; retain separate existing delayed recall. Preparation effect timing is a design tradeoff and must be public, not a hidden-test surprise.

## A1 assessment matrix

1. Positive: borrowed input plus formatter capturing local Rc<RefCell<Vec<String>>>; construction call log equals all inputs in order; drop input and callback-owning scope; returned future still satisfies Send+'static and produces owned output.
2. Positive: non-Clone formatter capture and a genuinely !Unpin, non-Clone pause implementation; no unjustified Clone/Copy/Debug/Unpin bounds. The pause may safely contain PhantomPinned plus shared observation state; poll reads through Pin<&mut Self> without moving pinned fields and updates only shared/interior-mutable state. Assert the consumer and reference compile on exact 1.85 and selected current stable. The named manual-Future positive must safely pin P (for example Pin<Box<P>>) instead of requiring P: Unpin.
3. Positive: zero, one, multiple, duplicate, empty-string and Unicode inputs; repeated independent calls do not share state.
4. Positive: controlled pause returns Pending twice and records current waker; callback count stays fixed; releasing/waking yields exact Ready output. No sleep-based race assertion or unbounded poll loop.
5. Positive: drop unpolled and drop Pending leave formatter effects unchanged; no output falsely reported. Test boundary is local memory, not external rollback.
6. Compiling full-public-API behavioral negatives: callback invoked twice during construction, first record only, reversed output, eager Ready ignoring pause, bypassing pause only for zero records, empty output or input strings substituted for formatter result. Each retains the exact generic API, compiles against the full hidden harness (including non-Send F and !Unpin P consumers), and fails its designated assertion. Timeout/compile failure are not behavioral rejection. The bypass-pause-on-empty mutant must be rejected by a named zero-record Pending test; nonempty Pending alone cannot detect it.
7. Compile boundary pairs: retaining/defering arbitrary generic F in the returned Send future is rejected because the declared F bound does not imply Send or static; a concrete Rc-bearing formatter across await is rejected as !Send; borrowed local input/callback captured in return is rejected at the lifetime boundary. Matched corrected programs pass. Capture diagnostics from intended authored spans; accept relevant diagnostic class rather than fragile entire-message strings.
8. Native Tokio: use existing pinned supported Tokio fixture/runtime. Spawn the returned handoff on actual maintained runtime, arrange controlled pending via oneshot, prove it is not finished before release without wall-clock races, release and join exact result; drop local input/captures before spawn. Browser std-only bound checks are not this runtime proof.
9. Evidence semantics: old clean + new clean => two; old helped + new clean => one; new reveal then later sibling/retry does not erase help; replay/version/ref aliases deduplicate; review identity cannot supply primary; clean recovery availability and exhausted state remain truthful.

## File ownership and verification handoff

Content implementer owns new `src/content/async-lending-send-transfer.ts` with pure solutions/contract/alternates/mutants/boundaries and exported step(s); wires append into `async-lending-boundaries.ts` and criterion/exit copy in `async-lending-module.ts`. Use existing callback/dyn transfer organization, avoiding a large duplicated boundary file.

Assessment implementer may own new `async-lending-send-transfer.test.ts` and `async-lending-send-transfer-boundaries.test.ts`, using existing native-test-support, and extend fixtures/verifier only after content export contracts are fixed. A single integration owner owns shared registries, existing aggregate expectations, historical projection tests, browser specs and documentation. Parallel work is suitable only after interfaces are frozen; all implementation must use the user-required model/effort relayed by parent.

Reuse maintained `scripts/verify-async-lending.ts` / trusted authored project fixture for real Tokio proof; inspect its current extraction/source binding first. Do not add network dependencies, arbitrary source execution, new runner provider or loosen fixture restrictions. Relevant source docs and installed Next guides must be read before any framework code change; no UI redesign is requested.

Snapshot immutable pre-A1 lesson-qualified identities and saved-state fixture before edits. Add an explicit historical projection removing only declared additions; do not regenerate old fixtures or broadly filter unknown steps until old tests pass. Preserve all V1/V2/V3 raw event order/time/help, reviews/ratings, drafts/attempts, completion, notes/bookmarks, lesson/step/panel and route settings on import/reload. Append-only source compatibility is necessary but not enough: execute exact old saved-location/browser cases and new task persistence/reveal cases, keyboard and 390px layout, offline warmed-resource flow. A historical completed lesson remains historical completion, not a new A1 pass.

Required local checks: lint, typecheck, full unit suite, content validation, authored Rust, source registry audit, build, full maintained production browser and offline suites. Execute new positives/mutants/compiler pairs on actual selected stable and exact Rust 1.85; record toolchain/source hashes and distinguish installed alias from selected current stable. Run maintained async verifier modes with exact command support confirmed from script. Parent coordinates any full additional native CI jobs in the ordinary all-eleven gate. Do not invent execution here.

Independent review must inspect public promise versus each hidden test, alternate valid implementations, actual Pending, intended diagnostic sites, native Tokio versus browser attribution, family difference, assistance semantics and compatibility. Any failure reopens acceptance. Commit + English PR + current exact-head reviews + all eleven PR checks + ordinary merge + all eleven main checks closes A1 only, not this broader goal.

## Whole-goal Definition of Done

All inventory rows have current source anchors, explicit bounded objectives and prerequisite path; substantive theory/action/verification/transfer and project connection; independent families claimed only when contracts differ; appropriate compiler/native/tool evidence; open design and changed requirement artifacts where required; no required pilot/hosting or fake observed learning. Every implemented milestone has full local evidence, reviewed exact source, ordinary release and main CI. A final independent source audit reconciles the whole advanced map and identifies remaining external/empirical limits. Coverage of headings, raw counts, completion clicks, public tasks labeled unseen, and greener cached mastery cannot satisfy this DoD.

## A1 exact integration and release addendum

Parent-reported release update: PR67 ordinarily merged as `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`, same tree `7638d5f7a07ca24907a15edec7ea7d3627496d18`. At the time of this planning addendum main run `38733773185` was pending. The coordinator subsequently confirmed all eleven jobs successful before implementation, as recorded above. This is attributed parent evidence, not my independent GitHub verification.

Exact new task refs (all within existing lesson `async-lending-send-boundary`):
- Supplementary appended step `async-lending-send-boundary-handoff-model`: `kind: predict`, `evidenceKind: prediction`, version 2, exact conceptIds `["async-lending-send-boundary"]`, no codingTaskId, no evidenceGate. Its feedback includes the synchronous-preparation versus suspended-state contrast; no self-rated prose awards primary credit.
- Appended primary step `async-lending-send-boundary-prepared-handoff`: `kind: apply`, `evidenceKind: transfer`, `evidenceGate: true`, `evaluator.kind: tests`, version 2, exact conceptIds `["async-lending-send-boundary"]`, codingTaskId `async-lending/send-prepared-handoff-v1`. One step only; do not add a new blank alias merely to inflate counts.
- Existing primary refs `async-lending-send-boundary/async-lending-send-boundary-gate` and `/async-lending-send-boundary-blank` stay untouched, sharing `async-lending/send-boundary-v1`.
- Existing supplementary prediction, explanation and recall stay in place with unchanged identities. The registered executable `async-lending-send-boundary-review`, family-shaped review ID `review/async-lending-send-boundary-review-v1`, remains recall-only and does not count as primary. Its `ready(...).await` is not claimed as real suspension.
- Add the new primary taskRef to existing criterion `async-lending-send-boundary-contract`, retaining `requiredIndependentCodingTasks: 1`; retain assessment ID, lesson IDs, concept version 2 and concept minimumCodingTasks 2.

Critical integration detail found in source: the bottom loop in `async-lending-boundaries.ts` overwrites each step's evidence, except the existing dyn transfer. Extend that exact explicit preservation mechanism to the new transfer step; otherwise the valid family metadata is silently lost. The supplementary model can use normal no-family attribution. Assert the fully assembled course registry, not just the exported fixture step.

No callback, cancellation, ownership or dyn concept receives primary credit from incidental behavior in this task. Predictions and own-word explanations remain supplementary. Delayed eligibility stays the established strict **more than 24 hours** after latest preceding relevant contact/rating, with two qualifying clean primary families earned before recall. No delayed threshold, queue selector or global policy change is authorized by A1.

Representation-diverse positive matrix must include (a) synchronous for-loop preparation then boxed async future, (b) synchronous iterator collection then boxed async future, (c) named owned state with manual Future delegation to pause. None should be required to use Rc; Rc is a consumer-side witness that forbids overstrict F bounds. The negative that retains an Rc-bearing callback across suspension is a compile-boundary witness. Deferring arbitrary generic F is also a compile-boundary failure under the exact public API; using a Send callback at one call site cannot make its generic function body valid. Strengthening F to Send + static changes the contract and fails the non-Send-client harness at compile time. Neither is a compiling full-API behavioral rejection. No unsafe erasure is permitted. A separately narrowed Send-only timing comparator would establish only its own limited contract and is unnecessary for this milestone.

Tokio handshake detail: use a signal inside the supplied pause to report it was polled, followed by a separate oneshot permission. Await the poll signal in the test before checking `JoinHandle::is_finished() == false`, then release and join. This gives an observation barrier rather than `yield_now()` or sleep luck. The fixture uses the existing trusted runtime and should not assert a particular worker thread ID, since scheduler placement is not the contract.


## Pre-implementation design adjudication

Parent identified the generic-body Send issue after reviewing the first packet. The assessment matrix above is corrected: earlier hash `ee8c2fd8cf1f303382b6f7fae4367f1b38f28cf0fb82f45fae33fb8f3948c51b` incorrectly suggested a Send consumer alone could make a deferred-F generic mutant compile. That claim is withdrawn, not treated as verified behavior. The accepted plan requires full-harness compiling construction-time semantic mutants and separately labeled compiler-boundary witnesses. No code or tests were executed for this correction.

Genuine !Unpin/non-Clone pause and non-Clone F consumers are mandatory positive witnesses. Both nonempty and empty-record calls must observe actual Pending before release. Zero input suppresses formatting, not pause. The two appended steps bring this existing five-step lesson to seven; no lesson count change is planned. At that pre-implementation checkpoint main was 9/11; the coordinator subsequently closed the gate with all eleven successes before product edits. Toolchain note for executor: current Node22 path is `/opt/homebrew/opt/node@22/bin` (22.23.3_3); the removed old Cellar `_2` path must not be used, and earlier Node26 preflight remains separately attributed.

## Final source handoff constraints and actual preflight attribution

The trusted Tokio 1.53.1 profile enables `rt`, not `rt-multi-thread`. Use its existing current-thread runtime for the actual `tokio::spawn` witness and the poll-signal/permission barrier. Tokio spawn still imposes the genuine Send + static API requirement on this runtime. Neither passing that bound nor running on the current-thread executor demonstrates migration to another worker; make no worker/thread-ID claim and add no runtime feature merely for this exercise.

The new handoff task precedes the later dyn-adapter lesson. Its supplementary model must therefore explain the provided wrapper locally: Box owns the heap-allocated future; dyn Future is the erased interface with the declared Output; Pin prevents moving the pinned future value through this handle and allows safely polling a !Unpin pause when appropriately pinned; Send and static describe retained task state, not magic conversion of Rc. Distinguish moving the Box handle from moving its pinned pointee. State boxing/dispatch/allocation costs without requiring learners to derive a dyn abstraction or master opaque capture syntax. The supplied signature is scaffolding for the ownership/suspension objective. No prerequisite on the later dyn lesson and no circular prerequisite is introduced.

Actual technical preflight is delegated Sol evidence, now read directly in `<private-temp>/receipt-011/sol-preflight/generic-send-probe/report.md`; raw hashes/commands/diagnostics are in sibling `summary.json` and compiler/variant folders. Both selected current Rust 1.99.0 and exact Rust 1.85.0 produced ten compiler records total and four successful execution twins total. Exact-API deferred F fails even with a Send consumer; strengthening F to Send + static admits the Send consumer but excludes required Rc/local-borrow consumers; exact synchronous preparation succeeds after local owner destruction. This confirms the corrected API-feasibility design, not the full future feature.

The generic deferred-F failure has **no diagnostic E-code** on either compiler. Its primary return-box/async span reports that the future created by the async block is not Send. Match diagnostic class/message plus intended primary authored-source span; do not require E0277 there. E0277 applies to the strengthened-bound Rc-client case; the borrowed local client has E0373/E0505. The preflight uses ready(()) to isolate generic feasibility, so it provides no genuine Pending or Tokio runtime evidence. Required final native/compiler/browser/compatibility/full-release checks remain unchanged.

This final handoff incorporates the delegated authorized design decision; it does not require another human approval question. The coordinator subsequently confirmed the main release gate before product source implementation; A1 release acceptance remains separate. Only private planning artifacts were edited by this reviewer.
