# Source-bound curriculum audit — 10 October 2026

[Polski](curriculum-audit-2026-10-10.pl.md)

The complete static semantic audit examined source `fc3491a74e30557ebea1196986d136ca66a43973`, tree `cfba502e64f648483174ec7e2028eb6640b0105a`. The audit found existing coverage of all original topic headings and five project families, with ten concrete depth/copy corrections. This correction candidate authors those repairs. Integration review, complete software checks, latest-head CI and merge remain separate acceptance work; authored availability is not observed learning.

## Coverage and reproducible source evidence

The audited baseline has 48 modules, 189 lessons, 191 concepts, 195 competencies, 1,219 steps, 334 sources, 13 registered projects, seven traces, 191 ordinary reviews, two delayed reviews and three short probes. The correction candidate retains all those registry IDs/order and adds 23 steps and seven sources: **1,242 steps and 341 sources**, with 146 steps of kind `blank` (mixed task contracts) and 463 lesson test evaluators. These are inventory counts, not 146 unrestricted design projects or earned competencies.

[The committed audit ledger](evidence/curriculum/2026-10-10-audit-ledger.json) contains all 189 source-qualified lesson rows, exact audited-source anchors, objective/theory/practice/assessment/prerequisite judgments and substantive dispositions. Core17's 70 lessons received direct Astra semantic review; all 119 extension lessons received direct Sol review followed by Astra review of every substantive row and independent reread of flagged contracts. It is not a claim that Astra independently reread every Rust body line by line. Missing, unread and duplicate lesson rows: zero. The audit reconciled 19 original topic slots, five project families, all 34 runtime roadmap labels and historical planning themes. The independently source-qualified original-brief pass consolidated 145 requirements (122 covered, 19 partial, four unsupported inferences at the pre-correction cut); heading coverage did not override depth findings.

The read-only audit ran no compiler, browser, archive verifier or CI campaign and did not recheck all 334 live source URLs. The committed [pre-correction identity fixture](../src/content/baseline-correction-legacy.json), [explicit additions](../src/content/baseline-correction-delta.json) and compatibility tests preserve every old lesson-qualified step occurrence/index, including duplicate bare IDs. Earlier M10/M11 and legacy fixtures remain byte-unchanged. Source references below resolve within this repository; private orchestration files are not the sole evidence.

## Original completion map

Core17 is the beginner spine, with 70 lessons from [foundations](../src/content/foundations.ts) through [Log Analyzer](../src/content/log-analyzer.ts). It supplies technical prerequisites for the learner-owned Study Session CLI. Original completion also includes [Mini grep](../src/content/mini-grep-module.ts), four lessons whose first prerequisite is Log Analyzer, and the existing **boxed-values → shared-ownership → threads → channels → synchronized-state** path, 15 lessons. Box/Rc/Weak and channels support the existing thread/Arc/Mutex graph. This is 89 authored lessons plus the separately learner-owned final assignment. [Route IDs, group order and endpoint behavior](../src/engine/course-route.ts) remain unchanged; atomics, Tokio, GAT, FFI and all 31 extensions are not mandatory.

The five original project families are Number Guessing+, Todo CLI, Log Analyzer, Mini grep and **Study Session CLI**, the existing open final instruction on the [Log Analyzer project card](../src/content/log-analyzer.ts) and [downloadable README](../src/content/projects/log-analyzer.ts). Study Session composes argv/files/UTF-8, typed errors, checked aggregation, deterministic ordering, stdout/stderr and exit 0/1/2, learner-chosen types/decomposition, own tests and rationale. Its local/std-only contract needs no network, timestamps, deployment or performance threshold. The public `--min-total N` change is available after documented self-review or external review; record the category and prior exposure. It is not guaranteed unseen, automatically graded or an observed learner success. Durable Log Service remains the optional advanced integration capstone.

| Original topic | Current authored coverage | Depth decision |
| --- | --- | --- |
| 0 Setup/Cargo/first program | first-program, modules-cargo, downloadable Cargo projects | Adequate; distinguish local tools from browser execution. |
| 1 Variables/scalars/functions/expressions | foundations, then conversion lessons | B02 authors primitives/tuple/unit/numeric depth; do not add every numeric API. |
| 2 Control flow | control-flow plus while-progress/loop-values/loop-control | B02 strengthens independent selection/iteration; loop families otherwise substantive. |
| 3 Stack/heap/scopes | memory-intro plus authored traces, later Drop | B03 authors an accurate model and new trace; no pretend physical-layout proof. |
| 4 Ownership | ten ownership lessons, calibration families | B01/B03/B04; four concepts remain provisional after correction under the two-family selector. |
| 5 Borrowing/mutable/slices | borrow-intro, two calibration lessons, slices and collection revisits | Real repeated owner-preservation tests; B05 array lead-in. |
| 6 Structs/methods/enums/Option/match | seven data-modeling lessons | B05 common patterns/checked arithmetic; B06 free-design checkpoint. |
| 7 Vec/String/HashMap | three substantial collection lessons and projects | Unicode/absence/growth/Entry practice adequate; B09 chunking. |
| 8 Result/?/panic/errors | three error lessons, checked conversions and projects | Adequate first theory/practice; Feature 1 later composes fallible values/pipelines. |
| 9 Modules/crates/packages/Cargo | four module lessons plus real archives | Proper visibility/import/target distinction; advanced publication optional. |
| 10 Generics | T/U, generic impl, minimal bounds | Adequate; non-Copy/Clone/Debug cases prevent numeric-only assumptions. |
| 11 Traits | required/default/consumers/associated/dyn and conversions | B07 derive/coherence bridge; advanced API compatibility already separate. |
| 12 Lifetimes | problem-first E0106, borrowed structs and API choice | Adequate before optional variance/HRTB/GAT. |
| 13 Closures/iterators | capture/Fn traits, ownership/pipelines/laziness/custom Iterator | Adequate foundations; B06 and selected fallible composition deepen synthesis. |
| 14 Tests/fmt/Clippy | three testing lessons, local experiment, every project | Adequate testing foundation; Feature 2 explicitly trains unfamiliar docs/diagnostics. |
| 15 Smart pointers (original optional) | Box/Deref/Drop and Rc/RefCell/Weak | Real contracts; these are also existing support bridges to threads. |
| 16 Threads/Arc/Mutex (original required) | threads, channels, synchronized-state | Real thread IDs, ownership, joins, guards and poison recovery; continue outside Core17. |
| 17 Async intro (original optional) | four Future/await/ownership/cancellation lessons | Substantive bounded futures; B10 scaffold glossary; Tokio beyond intro optional. |
| 18 Final projects | Guessing+, Todo, Log Analyzer, Mini grep, existing open Study Session CLI | All five original families authored. Explicit final-assignment role and contract summary in B08. Advanced Durable Log Service is additional. |


## Correction dispositions

| Finding | Authored correction and bounded evidence |
| --- | --- |
| B01 execution mismatch | Four existing answer evaluators now require actual exact stdout; no primary coding-family credit. `memory-modify` retains exactly empty concepts. |
| B02 primitives/control flow | Existing lessons append numeric, return/unit/tuple and independently tested range tasks. |
| B03 memory/move | Accurate owned-storage model, nested move observation and consuming owned-uppercase API; no physical stack-layout promise. |
| B04 explanation/open evidence | Own-words move/Copy reflection and self-reviewed extra boundary tests; prose is self-assessed. |
| B05 ordinary patterns | Arrays/slices, checked optional arithmetic, if-let/while-let/let-else and borrowed non-Copy bindings; exact Rust 1.85-compatible syntax. |
| B06 intermediate design | Two problem-only checkpoints at modeling-assessment and iterator-contracts with learner-selected types, tests/rationale and changed requirements. |
| B07 derive/coherence | Derived/manual identity contracts and qualified own-trait/own-type coherence bridge. |
| B08 scope/language | Original continuation/final-assignment map, Polish FFI/Miri cards, consistent std-only/self-review contract. |
| B09 session chunks | Optional stable-anchor stops in substantial lessons. Existing Todo/I/O stops retained. Estimates are provisional, not observed durations. |
| B10 extension accuracy | Reused scratch buffer may grow under read_line; same-contract workload reconstruction; tagged raw retrieval; option-specific oracle feedback; native auto-trait negatives; finite async observer glossary. |

## Calibrated evidence availability

The current selector requires two distinct clean primary families backed by tests for calibrated concepts. Authored availability is distinct from a learner earning eligible families. Review sessions, prediction, trace work, exact stdout, self-rating and repeated aliases do not create a second primary family; old evidence/assistance stays raw and historical. No global recalibration or saved-schema migration is introduced.

| Ownership concept | Distinct authored primary families |
| --- | --- |
| stack-heap; scope-drop; copy-semantics | zero each — conceptual/trace material exists but remains provisional |
| ownership-repair | ownership/read-length — provisional |
| move-semantics | ownership/read-length; ownership/owned-uppercase |
| function-ownership | ownership/read-length; ownership/function-predicate-v1; ownership/function-return-owned-v1 |
| shared-borrow | ownership/read-length; ownership/shared-count-words-v1; ownership/shared-has-suffix-v1 |
| mutable-borrow | ownership/mutate-append; ownership/mutate-replace; ownership/mutate-surround |

Four of eight ownership concepts remain provisional (pre-correction: five); the new narrow move family changes only authored availability. Of nine calibrated advanced concepts, receiver, callback and dyn adapter each have two families. Six remain single-family: `async-lending-cancel-commit`, `async-lending-send-boundary`, `unsafe-miri-byte-view-contract`, `unsafe-miri-disjoint-regions-contract`, `unsafe-miri-slot-state-contract`, `unsafe-miri-mut-slot-variance-contract`. Their topics have real lessons/code; the limit is the current two-family selector. [Advanced family definitions and dated execution evidence](async-transfer-evidence.md) retain their historical scope.

## Existing bounded specializations and actual deferrals

| Existing branch | What is substantively authored | What remains a bounded limitation, not an original missing topic |
| --- | --- | --- |
| Borrowed callbacks, HRTB and GAT | Lifetime relations, mutation invariance, fresh-call callbacks, lending receiver items, overlapping sequential windows, owned adapters; changed contracts and compile witnesses | Not the entire type system or every compiler limitation. |
| Threads/channels/shared state, atomics/order/Loom | Real worker/ownership/guard contracts; CAS and ordering models; separate Loom packet | Stress/finite models do not prove all interleavings or universal progress/performance. |
| Async/Tokio/lending | Laziness, wake/poll, ownership/cancellation; tasks, channels, timeouts/select, partial I/O, streams, blocking lifecycle, TCP and shutdown | Three calibrated async concepts have two families; cancellation/commit and Send have one each. Browser Send bound checks are not a spawned Tokio run. |
| Public API/Cargo/release/macros/dependencies | Real API clients and owned errors, manifest tasks, features/MSRV/archive policy, macro effects/grammar/hygiene; separate Cargo consumer/assurance packet | Some later evidence classifiers merely rename the same finite rule. Live advisory/publishing and complete SemVer decisions are not automatically verified. |
| Mini grep/property/fuzz | Meaningful changed selection/framing/path/CLI contracts; independent oracle/generator/shrink/metamorphic work; native fuzz packet | B10 repairs the flagged fuzz feedback; author campaigns are not learner discovery or universal input coverage. |
| Performance/profile/allocation | Workload/cost models, scratch reuse, event/measurement-window/comparability decisions; separate actual profiling/allocation packet | Several browser blanks repeat their primary algorithm. A trace length is a proxy; it does not operate a profiler. A vector of views can still allocate. B10 corrects the flagged hard-bound language. |
| Unsafe/FFI/Miri/borrowed memory | Caller contracts, initialization/disjointness/drop/reborrow/auto-traits, native C/Miri packets and safe wrapper transfer | Four calibrated Miri concepts remain one-family. Browser success is not universal soundness or a native Miri result; target ABI and negative clients stay explicitly scoped. |
| Service operations/advanced capstone | Admission/telemetry/drain/incident models, service packet, durable idempotent commit/version/recovery integration and open K change | Several browser classifiers repeat a rule; design rubrics are self-assessment. Actual operations, deployment, real external review and learner performance are not established. |


Runtime roadmap labels now identify the available bounded Cargo/dependency/release, profiling/allocation, service-operations and Study Session implementations. Actual registry publication, live advisory operations, production deployment/incidents, broad unsafe guarantees, universal performance work and further independent specialization families remain deferred. A finite source model, native authored packet and learner artifact are distinct evidence categories.

The selected next stage is exactly **two sequential PRs**: two fallible-composition lessons, then one documentation-guided API/diagnostic-repair lesson. Neither is part of this baseline correction. See the [current objective and release plan](superpowers/plans/2026-10-10-curriculum-baseline-and-synthesis.md). No human pilot is a development gate. No retention, efficacy, general mastery, professional readiness, seniority or complete accessibility claim follows from this authored audit.


## 15 October 2026 A1 source addendum

The current source appends two steps to the existing Send lesson: a supplementary synchronous-preparation model and the primary `prepare_handoff` contract (`async-lending/send-prepared-handoff-v1`). Send joins receiver, callback and dyn adapter with two authored primary families; cancellation/commit and four Miri concepts remain single-family. The four provisional ownership concepts remain unchanged. The current inventory is 48 modules, 192 lessons, 194 concepts, 1,271 steps and 349 sources. Counts describe availability, not learning or seniority. The accepted maintenance base is ordinary main `3c1ee89c3d46b0b1b9e3798a317587464a236e5c`; the coordinator confirmed all eleven resulting-main jobs before edits. A1 source verification/review/release acceptance remains pending. The [advanced continuation and frozen A1 requirements](superpowers/plans/2026-10-15-advanced-continuation.md) preserve the broader active goal and historical evidence boundaries.
