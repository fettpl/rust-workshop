# Curriculum closure | 11 November 2026

The original brief, October findings, advanced continuation requirements and
Plans 001–004 are reconciled for the locally authored curriculum. The audience
starts Rust from zero with basic programming knowledge. The 19 original topic
rows map to 17 Core modules and their extensions. The current catalog has 51
modules, 204 lessons, 1,359 steps, 199 concepts, 200 competencies, 349 sources
and 16 projects. The Core route and all predecessor lesson identities,
duration fields and saved-state behavior were checked against the accepted
baseline. Both file schema evolution lessons omit duration metadata.

| Requirement | Current anchor and check |
| --- | --- |
| Original topics 0–18 | The [Core coverage matrix](#original-core-coverage) maps foundations, ownership and borrowing through testing, concurrency, async and final projects to the authored modules. [Route and prerequisite tests](../src/content/prerequisite-entries.test.ts) distinguish Core from optional modules. [Testing and tooling](../src/content/testing.ts) separates Rust tests, rustfmt and Clippy and provides a terminal exercise. |
| Discovery, compiler feedback and retrieval | [Lesson workspace](../src/components/lesson-workspace.tsx), [Compiler Coach](../src/components/compiler-coach.tsx), [learning engine](../src/engine/learning.ts) and [review](../src/components/review.tsx) retain predict/run/observe, explanation, repair, transfer and delayed recall. The counted-gate maintenance checks assistance before awarding independent family credit. |
| Independent transfer and open projects | Authored blank-editor tasks retain their testable contracts. [Study Session](../src/content/log-analyzer.ts) supplies a problem, observable criteria and retrospective while leaving architecture and decomposition to the learner. [Capstone maintenance](capstone-change-review.md) adds changed requirements, diagnosis and review. |
| Advanced sequence and October findings | The [advanced coverage](#advanced-coverage) and [October follow-through](#october-review-follow-through) matrices retain the A1–A9 anchors. [Client retry](client-retry.md), [typed authorization](service-authorization.md) and [file schema evolution](file-schema-evolution.md) close Plans 001, 002 and 004. [Plan 003](../plans/003-review-assistance-gates.md) records the separate assistance correction. |
| Local continuity and verification | [Persistence](../src/persistence/state.ts) and the fresh A12 compatibility checks cover existing save envelopes, raw history and exact resume. The production browser checks exercise UI/state, offline continuity and downloads. The [A12 acceptance](../plans/004-file-schema-evolution.md) records the separate native fixture and full-history recovery checks. |

The audit found no additional required authored topic in the maintained
curriculum sequence. The post-A6 UI redesign remains a proposal. Existing
lesson duration fields and current onboarding presentation remain compatible.
The development inspector reports mastery and review reasons, but still has
no separate migration trace, as recorded in the [product requirements audit](requirements-audit.md).
That is an app observability item outside the authored curriculum.

Human learning, unseen transfer, retention and assistive-technology outcomes
require separate observation. Hosted CI, live external execution smoke tests,
publication and deployment have separate acceptance gates. Historical
checkpoints below retain their original dates and attribution.

# File schema evolution source checkpoint | 10 November 2026

The authored catalog contains **51 modules, 204 lessons, 1,359 steps,
199 concepts, 200 competencies, 349 sources and 16 projects**. Navigation retains
17 Core modules and offers 34 extensions. The [file schema evolution extension](file-schema-evolution.md)
adds two lessons, 12 steps, one concept, one competency, one coding task family
and one native project. It follows Todo I/O and preserves the existing Todo and
SQLite teaching surfaces. Both new lessons omit duration metadata.

The coverage addition is preservation of record meaning and allocation history
across supported V1 and V2 files, followed by explicit replacement under a
single-writer assumption. Browser normalization checks use already decoded
values. The package separately covers byte parsing and owned filesystem cases.
Apply and blank count toward one gate family, ordinary review is retrieval, and
the second lesson is practice. Existing review-family assistance remains in
scope for counted gates. Learner transfer and final local qualification are
separate observations. The checkpoints below retain their original attribution.

# Typed authorization source checkpoint — 4 November 2026

The current authored catalog contains **50 modules, 202 lessons, 1,347 steps,
198 concepts, 199 competencies, 349 sources and 15 projects**. Core retains
17 modules; extensions now contain 33. The optional
[typed authorization extension](service-authorization.md) adds four lessons,
24 steps, two concepts and four primary coding families after service operations.
It teaches exact-scope decision, attenuation, request-bound ownership and
consuming admission. Two ordinary reviews and empty-editor blank aliases
preserve the existing evidence rules. No duration estimates are added.

The browser binding dependency is a labeled deterministic test double; its
admission witness is fixed test input. The separate native package supplies
the real private composed API. Synthetic principals are not authentication;
there is no TLS, credential, global replay, distributed revocation or measured
resource-bound claim. Source availability does not establish learner transfer,
security, efficacy or readiness. Final local qualification is a separate record;
publication, Actions and remote integration holds remain. All dated checkpoints
below retain their original dates, counts and evidence attribution.

# Curriculum reconciliation — 3 November 2026

This review reconciles the original Core 0–18 topics, fourteen advanced areas and the eighteen priorities from the October curriculum review. The audience has basic programming knowledge and starts Rust from zero.

The accepted A8 baseline contains **48 modules, 196 lessons, 1,305 steps, 194 concepts, 195 competencies, 349 sources and 13 downloadable projects**. Navigation contains 17 Core modules / 74 lessons and 31 extension modules / 122 lessons. The original numbered topic outline is a coverage map; its nineteen rows are not nineteen navigation modules.

A9 preserves those counts and IDs. It tightens the fixed return type `R` description in the `MutSlot::with_mut` model step and requires a genuinely new neutral ownership exposure after an offline reload. The engine, assessment families, credit rules, Rust examples and downloadable project contents remain unchanged. Historical compatibility checks restore only the exact changed phrase before applying the existing A8 → A7 → C1 projections.

## Interpretation

Authored availability means the course offers a topic or practice opportunity. A reference test, a maintainer run and a learner’s independent evidence are separate observations. Current calibration metadata selects 20 concepts: 17 version-2 and 3 version-1 entries, 42 concept-family rows, 39 unique families and 19 concepts meeting their authored minimum. The conceptual stack/heap introduction deliberately has no coding family. These counts describe the material; they do not measure learner attainment.

## Original Core coverage

| Area | Authored availability and source | Verification scope / remaining learner observation |
| --- | --- | --- |
| 0 | Foundations, modules/Cargo and workspace surfaces. [foundations.ts](../src/content/foundations.ts), [modules-cargo.ts](../src/content/modules-cargo.ts), [course.ts](../src/content/course.ts) | Existing authored checks and package surfaces. No publication, dependency-operations or reproducible-build outcome. |
| 1 | Bindings, mutability, scalar/function/expression practice. [foundations.ts](../src/content/foundations.ts) | Constrained executable tasks. Beginner fluency and transfer unobserved. |
| 2 | while/loop/continue/label contracts. [loops.ts](../src/content/loops.ts) | Authored loop tasks. Retention and transfer unobserved. |
| 3 | Scope/drop availability; stack-heap intentionally conceptual. [catalog.ts](../src/content/catalog.ts), [ownership-foundation-transfer.ts](../src/content/ownership-foundation-transfer.ts) | Drop/ownership transfer contracts. No physical-layout or learner mastery claim. |
| 4 | Move/Copy/function/shared/mutable ownership families. [course.ts](../src/content/course.ts), [ownership-foundation-transfer.ts](../src/content/ownership-foundation-transfer.ts) | Current tests-backed family inventory. Availability is not learner credit or a whole-course learner outcome; predecessor acceptance is a separate evidence boundary. |
| 5 | Borrowing, mutable borrowing, slices and related String/UTF-8. [modeling.ts](../src/content/modeling.ts), [collections.ts](../src/content/collections.ts) | Collection/borrow contracts and tests. Broader cost/text-processing transfer remains bounded. |
| 6 | Records, methods, enums, Option and match. [modeling.ts](../src/content/modeling.ts), [nested-patterns.ts](../src/content/nested-patterns.ts) | Fixed modeling tasks. Unrestricted learner modeling not observed. |
| 7 | Vec/String/HashMap and iterator composition. [collections.ts](../src/content/collections.ts), [iterators.ts](../src/content/iterators.ts) | Collection and iterator fixtures. No universal complexity/performance claim. |
| 8 | Result, ?, panic and domain errors. [error-handling.ts](../src/content/error-handling.ts), [todo-project.ts](../src/content/todo-project.ts), [public-api-evolution.ts](../src/content/public-api-evolution.ts) | Error-handling/project contracts. Whole-system recovery policy remains bounded. |
| 9 | Modules, crates, packages and Cargo. [modules-cargo.ts](../src/content/modules-cargo.ts), [cargo-dependency-lifecycle-module.ts](../src/content/cargo-dependency-lifecycle-module.ts) | Real package/workspace fixtures. No live publication/advisory operation claim. |
| 10 | Generic parameters, bounds and consumers. [generics.ts](../src/content/generics.ts), [traits.ts](../src/content/traits.ts) | Generic/trait tasks. Open architecture and cost rationale unobserved. |
| 11 | Traits, associated types, dyn and public clients. [traits.ts](../src/content/traits.ts), [public-api-module.ts](../src/content/public-api-module.ts), [api-release-matrix.ts](../src/content/api-release-matrix.ts) | API compatibility/package fixtures. Full SemVer policy remains bounded. |
| 12 | Lifetimes, variance, HRTB and GAT. [lifetimes.ts](../src/content/lifetimes.ts), [borrowed-variance.ts](../src/content/borrowed-variance.ts), [borrowed-hrtb.ts](../src/content/borrowed-hrtb.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Borrowed/MutSlot/Miri contracts. Native scope and learner transfer remain bounded. |
| 13 | Closures, iterators and lending. [closures.ts](../src/content/closures.ts), [iterators.ts](../src/content/iterators.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Executable closure/iterator tasks. No universal refactoring/performance outcome. |
| 14 | Unit/integration/doc/property/fuzz foundations. [testing.ts](../src/content/testing.ts), [property-contracts-module.ts](../src/content/property-contracts-module.ts), [fuzz-evidence-module.ts](../src/content/fuzz-evidence-module.ts) | Independent oracle and bounded mutant fixtures. No fuzz completeness or human review outcome. |
| 15 | Box/Deref/Drop/Rc/RefCell/Weak. [boxed-values.ts](../src/content/boxed-values.ts), [shared-ownership.ts](../src/content/shared-ownership.ts) | Smart-pointer ownership traces. No general concurrency competence from Rc traces. |
| 16 | Threads, channels, Arc/Mutex, atomics and ordering. [threads.ts](../src/content/threads.ts), [channels.ts](../src/content/channels.ts), [synchronized-state.ts](../src/content/synchronized-state.ts), [atomic-state.ts](../src/content/atomic-state.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Bounded concurrency/Loom models. No all-interleaving or universal progress claim. |
| 17 | Async/Tokio/cancellation/Send/service surfaces. [async-foundations.ts](../src/content/async-foundations.ts), [tokio-runtime-tasks.ts](../src/content/tokio-runtime-tasks.ts), [tokio-flow-control.ts](../src/content/tokio-flow-control.ts), [tokio-io-modules.ts](../src/content/tokio-io-modules.ts), [tokio-network-module.ts](../src/content/tokio-network-module.ts), [async-lending-module.ts](../src/content/async-lending-module.ts) | Current cancellation/Send families and bounded protocol fixtures. Transport security, authentication, deployment and learner transfer remain outside the bounded local service exercises. |
| 18 | Study Session/open-K and service/capstone architecture opportunities. [log-analyzer.ts](../src/content/log-analyzer.ts), [service-operations.ts](../src/content/service-operations.ts), [capstone-integration.ts](../src/content/capstone-integration.ts) | Project contracts and optional A6/A8 packets. Learner-owned decomposition, rationale and unseen transfer are unobserved, not absent from authored content. |

## Advanced coverage

| Area | Authored availability and source | Verification scope / remaining learner observation |
| --- | --- | --- |
| library-api-semver | Public API/compatibility practice. [public-api-module.ts](../src/content/public-api-module.ts), [api-release-matrix.ts](../src/content/api-release-matrix.ts) | A6 changed-client package checks. No publication or learner Cargo proof. |
| cargo-workspaces-msrv | Workspace/features/MSRV/dependency concepts. [modules-cargo.ts](../src/content/modules-cargo.ts), [cargo-dependency-lifecycle-module.ts](../src/content/cargo-dependency-lifecycle-module.ts) | Offline package/workspace fixtures. No live publication/advisory operation. |
| traits-generics-lifetimes | Generic/dyn/associated/HRTB paths. [generics.ts](../src/content/generics.ts), [traits.ts](../src/content/traits.ts), [lifetimes.ts](../src/content/lifetimes.ts), [borrowed-hrtb.ts](../src/content/borrowed-hrtb.ts), [gat-lending-module.ts](../src/content/gat-lending-module.ts) | Constrained API tasks. No cross-project learner design outcome. |
| iterators-closures | Iterator/closure practice. [closures.ts](../src/content/closures.ts), [iterators.ts](../src/content/iterators.ts) | Executable composition tasks. No universal speed claim. |
| smart-pointers | Pointer/ownership decisions. [boxed-values.ts](../src/content/boxed-values.ts), [shared-ownership.ts](../src/content/shared-ownership.ts), [synchronized-state.ts](../src/content/synchronized-state.ts) | Bounded ownership scenarios. Scenario scope only. |
| send-sync-atomics | Concurrency and ordering concepts. [synchronized-state.ts](../src/content/synchronized-state.ts), [atomic-state.ts](../src/content/atomic-state.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Small model/Loom boundary. No all-interleaving/progress claim. |
| async-tokio | Async/Tokio flow and cancellation. [async-foundations.ts](../src/content/async-foundations.ts), [tokio-runtime-tasks.ts](../src/content/tokio-runtime-tasks.ts), [tokio-flow-control.ts](../src/content/tokio-flow-control.ts) | Bounded pipeline fixtures plus the accepted A8 maintenance/recovery trace and rejection controls. The maintained reference does not establish learner transfer or production readiness. |
| robust-errors | Layered error design. [error-handling.ts](../src/content/error-handling.ts), [public-api-evolution.ts](../src/content/public-api-evolution.ts) | Domain/API error tasks. No whole-system policy claim. |
| property-fuzz-miri-loom | Risk/tool-selection concepts. [property-contracts-module.ts](../src/content/property-contracts-module.ts), [fuzz-evidence-module.ts](../src/content/fuzz-evidence-module.ts), [unsafe-miri.ts](../src/content/unsafe-miri.ts), [memory-ordering.ts](../src/content/memory-ordering.ts) | Fixture-specific property/fuzz/Miri/Loom controls. No universal completeness/soundness. |
| benchmark-profile-allocation | Workload/proxy/profile planning with a bounded authored A7 workload. [performance-evidence.ts](../src/content/performance-evidence.ts), [profile-evidence.ts](../src/content/profile-evidence.ts), [runtime-allocation-evidence.ts](../src/content/runtime-allocation-evidence.ts) | Accepted A7 stable and exact Rust 1.85 Criterion runs, independent literal/replay oracles, a named expected-rejection mutant and local browser/state/restore receipts. The workload is not unimplemented or merely partial, but its local receipts do not establish universal performance/RSS, learner efficacy or transfer. |
| unsafe-ffi | Unsafe/FFI invariants across four two-family authored concept pairs: ByteView/initialized-prefix, disjoint-regions/disjoint-ranges, Slot-state/lazy-init and MutSlot/with-mut. [unsafe-ffi.ts](../src/content/unsafe-ffi.ts), [unsafe-miri.ts](../src/content/unsafe-miri.ts), [unsafe-borrowed-memory.ts](../src/content/unsafe-borrowed-memory.ts) | Bounded safety fixtures and native controls cover authored availability; the registry 20/42/39/19 values are availability counts, not learner outcomes or universal Miri coverage. No universal unsafe soundness claim; native/fixture scope and learner transfer remain bounded. |
| architecture-observability | Open Study Session and service/capstone architecture opportunities. [service-operations.ts](../src/content/service-operations.ts), [capstone-integration.ts](../src/content/capstone-integration.ts), [log-analyzer.ts](../src/content/log-analyzer.ts) | Bounded maintenance packets and runbooks. Learner choice/rationale/transfer unobserved. |
| security-operations | Threat-model and operational boundaries. [service-operations.ts](../src/content/service-operations.ts), [durable-log-service.ts](../src/content/projects/durable-log-service.ts) | Local trust/archive controls. No production security/hosting/live advisory claim. |
| code-review-decisions | Review/disposition practice. [capstone-change-review.md](../docs/capstone-change-review.md), [capstone-maintenance-lesson.ts](../src/content/capstone-maintenance-lesson.ts) | Self-review and bounded packet fixtures. No independent human review or learner outcome. |

## October review follow-through

| Area | Authored availability and source | Verification scope / remaining learner observation |
| --- | --- | --- |
| corrected-beginner-audience | Rust-from-zero/basic-programming audience is documented. [README.md](../README.md), [onboarding.tsx](../src/components/onboarding.tsx) | Copy/source review only. No pilot or readiness evidence. |
| beginner-route | Core17/extensions31 navigation. [course-route.ts](../src/engine/course-route.ts), [course.ts](../src/content/course.ts) | Route/search checks. No readiness inference. |
| stable-resume-history | Stable IDs, resume, drafts, notes and history contracts. [state.ts](../src/persistence/state.ts), [lesson-workspace.tsx](../src/components/lesson-workspace.tsx) | Persistence/compatibility/browser fixtures. No cloud or learner-outcome claim. |
| neutral-navigation | Exposure separated from assessed evidence. [learning.ts](../src/engine/learning.ts), [verify-offline.mjs](../scripts/verify-offline.mjs) | Raw-event policy tests. Exposure is not independence evidence. |
| exact-concept-subsets | Exact current concept/family metadata. [course.ts](../src/content/course.ts) | Resolver/compatibility checks. Other-module family evidence remains bounded. |
| two-unaided-families | Current family selection policy. [learning.ts](../src/engine/learning.ts), [catalog.ts](../src/content/catalog.ts) | Tests-backed family inventory. Availability is not learner confirmation. |
| assistance-recovery | Chronology/help/recovery policy. [learning.ts](../src/engine/learning.ts) | State/recorder regressions. No fresh independence after exhaustion claim. |
| historical-evidence-policy | Raw history and version policy preserved. [state.ts](../src/persistence/state.ts), [learning.ts](../src/engine/learning.ts) | Projection/hash controls. Historical events are not current confirmation. |
| delayed-retrieval | Delayed-review rules and exercises. [review-session.ts](../src/engine/review-session.ts), [review.tsx](../src/components/review.tsx) | Chronology regressions. No measured retention. |
| compiler-led-cycle | Modify/debug/compiler feedback flow. [compiler-coach.tsx](../src/components/compiler-coach.tsx), [lesson-workspace.tsx](../src/components/lesson-workspace.tsx) | Constrained fixtures/mutants. No arbitrary-code or general proficiency proof. |
| completion-confirmation | Completion/history/current confirmation separated. [learning.ts](../src/engine/learning.ts), [overview.tsx](../src/components/overview.tsx) | State chronology checks. No global proficiency claim. |
| blank-page-portfolio | Existing constrained tasks plus Study Session open opportunity. [log-analyzer.ts](../src/content/log-analyzer.ts), [capstone-maintenance-lesson.ts](../src/content/capstone-maintenance-lesson.ts) | Fixed APIs and project contracts. Learner-owned decomposition/rationale/unseen transfer unobserved. |
| ordinary-core-fluency | Matching, Option/Result, borrowed collections, conversions, iterators and API reading surfaces. [modeling.ts](../src/content/modeling.ts), [error-handling.ts](../src/content/error-handling.ts), [iterators.ts](../src/content/iterators.ts) | Existing executable practice. Whole-course fluency and debugging depth unobserved. |
| reading-estimates | Legacy minutes remain compatible metadata; proposed navigation uses goals and next actions. [types.ts](../src/domain/types.ts) | The post-A6 UI proposal removes duration-based organization. No learning-time estimate or timing dataset is claimed; production redesign is deferred. |
| accessibility | Keyboard/focus/small-screen mechanics. [code-editor.tsx](../src/components/code-editor.tsx), [save-status-announcer.ts](../src/components/save-status-announcer.ts) | Bounded browser/Axe-style paths. No full screen-reader/assistive-tech or efficacy evidence; non-blocking future evaluation. |
| dated-current-snapshot | Dated source/evidence documentation. [curriculum-reconciliation.md](../docs/curriculum-reconciliation.md) | Accepted A8 source and genuine pre-A9 registry/state captures; A9 changes one model-prompt phrase and an offline verifier witness. Historical snapshots retain their original dates and counts. |
| product-review | Educational/UX/engineering review criteria. [curriculum-review-2026-10-06.md](../docs/curriculum-review-2026-10-06.md) | Accepted A6, C1, A7 and A8 local packets with independent source and evidence reviews. Automated acceptance does not substitute for observation of learners. |
| pilot-efficacy-readiness | Evaluation requirements documented only. [curriculum-review-2026-10-06.md](../docs/curriculum-review-2026-10-06.md) | None claimed. Pilot, efficacy, professional readiness and seniority remain non-blocking future non-claims. |

## Recent lesson and maintenance boundaries

A6 adds optional library maintenance and changed-client practice without a new primary family. C1 repairs five existing contracts: empty fuzz provenance, exact allocation error/retry controls, shared-read ByteView safety wording, borrowed generic-bound ownership wording, and integer-division wording. Old helper modules and historical expected hashes remain the reference data.

A7 is implemented and locally accepted. Its six-step optional performance workshop accompanies a 2,048-record maintained workload with actual stable/MSRV measurements. Timing is conditional on that workload and environment. The learner-owned worksheet asks for a different workload, an independent oracle, alternatives and a review response. See [Performance investigation](performance-investigation.md).

A8 is implemented and locally accepted. Its six-step optional capstone workshop adds a learner-owned maintenance plan and reference recovery trace. The durable project retains the original six assessed lessons, twelve gates and six retrieval reviews; the appended practice lesson adds no primary coding credit. Current archives contain forty authored members and five canonical notices. Harness admission, store outcomes and response delivery remain distinct. See [Advanced curriculum](advanced-curriculum.md) and [Capstone change review](capstone-change-review.md).

The Study Session CLI already offers an open architecture task: the learner chooses types, decomposition, error policy and a justified change. A6/A8 extend that opportunity with maintenance decisions. The remaining observation is the learner’s own design, rationale and unseen transfer; another portfolio lesson is not required solely to create an opportunity that already exists.

## Course structure and UI direction

The separately reviewed post-A6 proposal organizes navigation around the next useful action and learning objectives, with a clear Core route and thematic extension shelves. It uses goals, prerequisites and observable activity instead of 10/15/20-minute learning estimates. Legacy `minutes` values remain compatible data.

The proposed lesson workspace gives the task, editor and output clear priority, with separate mobile views. Completion, assessed evidence and assistance remain distinguishable. It retains all evaluators, Compiler Coach and raw diagnostics, editor fallback, focus mode, themes, notes, bookmarks, raw history, import/export, exact resume, offline use, save-error reporting and the developer inspector. Real review due dates and technical execution metrics keep their meaning.

This document records a proposal, not a production redesign. Observation with learners and assistive technology can inform a later implementation; no learning-duration, efficacy or professional-seniority guarantee is made.

## Local acceptance boundary

The local A9 validation packet binds the accepted source to genuine pre-edit registry and V1/V2/V3 state captures, current compatibility/unit checks, a fresh production build, browser suite and formal offline run. Unchanged Rust/native results retain their original accepted A8 input and tool bindings; they are not represented as freshly executed A9 checks. Local backup restoration and independent review close the milestone. Hosted Actions, deployment and public release remain separate future operations.

## Independent practice after the November assessment repairs

A fresh inventory at `ca9f08a` found 51 modules, 204 lessons, 1,360 steps and 16 downloadable projects. Of those steps, 506 run tests and 73 use a rubric. These counts locate practice opportunities. To assess learner independence, the review also examined what the prompt supplies, which decisions the learner makes, which artifact they produce, and how they can revisit it.

| Checkpoint | Work the learner owns | How to interpret it |
| --- | --- | --- |
| Parcel pricing in Foundations | Choose the return representation, write boundary tests and observe a real failing assertion in a local Cargo project. | The learner records the local observation. |
| Reservations in data modeling | Choose types and an API, then change the cancellation rule. | The rubric asks for the design and examples. |
| Report in iterators | Decide representation, borrowing, errors and tie behavior, then accommodate a changed requirement. | Multiple designs can satisfy the brief. |
| Study Session CLI at the end of the core | Choose types, decomposition and data structures, supply real CLI output and implement a follow-up filter with regression coverage. | The code and its execution belong to the learner. An independent reviewer can examine the artifact. |

**Selected repair.** The final Log Analyzer step previously offered a return to the map. Its separate Projects view contained the Study Session assignment, and the project retrospective shared space with Log Analyzer observations. A Chromium regression on the pre-change production build confirmed the endpoint had no Study Session entry. This affected the transition from the entire core to its independent assignment. The endpoint and Projects now expose the same brief and preserve the learner's design, test, run results, follow-up regression and remaining limitation as distinct notes. The notebook and progress export carry those notes. Writing them records neither a compiler run nor mastery.

**Follow-up to the practice audit**

1. **Ownership wording repaired locally.** The previous exact-answer evaluator rejected a valid explanation of borrowing in Polish. In the revised scenario, the learner explains the lifetime and ownership requirements in their own words and compares that explanation with a rubric. Separate choices check how to keep an independent snapshot and how to show a read-only preview. Earlier text submissions keep their original history. The three Log Analyzer recall prompts now accept free-form explanations. Learners compare their own account of parser boundaries, validation before filtering and deterministic output with separate criteria. These checks record self-assessment; executable exercises still verify behavior.
2. **Tokio shutdown criteria repaired locally.** The flow-control module records two independent results: draining accepted work after closing admission and collecting every child's outcome after signalling stop. The streams module records closing and draining the receiver separately from giving stop priority while preserving the next element. Existing successes follow their original task references. The additional two-worker join exercise keeps a fresh route to that criterion after viewing the pipeline project's solution.
3. **Collections event-report practice.** At the end of the HashMap lesson, learners choose how to represent repeated names, implement a name-sorted report and retain that view when an incident report requires first-seen order. They author a regression case with its expected rows and counts. The exercise runs their check against a correct report, a sorted report and a report that loses repeated counts. The choice of representation and its cost are recorded in the learner's notes. [Exercise](../src/content/collections-event-report.ts)

This review used catalog inspection, sampling of authored prompts, the application evaluators and browser navigation. Learner retention and the quality of an individual's submitted design require observation of actual work.

## Follow-up audit after the Log Analyzer repair

At local revision `7179689` the catalog had 51 modules, 204 lessons and 1,363 steps. The audit inventoried lesson evaluators, independent coding tasks and module criteria across the catalog, then traced selected criteria to their actual prompts, Rust tests and progress rules. Counts of blank editors alone understate open practice: the collections workshop, for example, supplies a public interface while leaving the data structure and regression case to the learner.

**Selected finding — foundational control flow.** A single successful `flow-modify` submission (extending a supplied loop by one number) satisfied the criterion for combining a range and a condition. Its supplied solution has no condition. The guided `flow-transfer` additionally supplies both constructs. The stronger multi-input `flow-range-transfer` already existed but was optional for this criterion. This affected progression in the first module, including learners who had never implemented the combined behavior.

The revised criterion accepts one independent Rust test result from two distinct tasks: counting qualifying values in a half-open range, or pricing an inclusive route whose rate changes at a threshold. Empty ranges, singleton ranges and threshold boundaries distinguish the behaviors. The second task starts with an empty editor and remains available after assistance on the first. An earlier valid independent success on the counting task still qualifies. Guided completions, drafts and raw evidence stay in history; a guided success alone leaves the revised criterion open. This change concerns the module gate. Behavioral tests establish the specified outputs, without inferring a particular loop syntax or recalibrating overall concept mastery.

**Remaining candidates.** The three error-handling lessons contain six executable repairs or modifications covering recovery, propagation and panic boundaries. Their prompts typically supply both the error type and the recovery policy. A later independent task could ask the learner to choose that policy and justify which errors the caller can recover from. Separately, two allocation-measurement recall prompts and two service-client retry/receipt prompts still use a single accepted prose answer; the async-lending receiver and adapter recalls allow only a small phrase list. These prompts warrant a wording audit alongside their executable contracts. This was a catalog and behavior audit; learner retention was not measured.

## Recovery policy and a second audit of borrowed results, 19 November 2026

The error-handling workshop now asks the learner to choose a reporting client and decide whether a missing measurement stops an import or produces a counted warning. Both policies are executable. A malformed measurement always stops the import and identifies the first rejected source row. The learner owns the implementation and explains the trade-off in their notebook. The Rust evaluator checks consistency with the declared policy; the notebook stores the learner’s reasoning for review.

The six previously flagged recall prompts now accept explanations in the learner’s own words. A second pass also found the adjacent cancellation/commit recall asking when a cursor may advance, with only two accepted phrases. All seven now compare a nonempty explanation with explicit self-assessment criteria. Existing coding gates and scheduled Rust reviews still exercise behavior. Earlier answer events, assistance, drafts and attempts keep their original identities.

After these repairs, the catalog scan covered 51 modules, 204 lessons and 1,365 steps. It compared evaluators with the capabilities claimed by module criteria and checked shared task references in the core. Shared references can be valid: the collections string transfer, for example, tests both mutation and the Unicode character count. In the Vec lesson, however, the borrowed-read gate and its combined transfer compared referenced integers only by value. A Rust implementation returning an equal number from a different position passed both previous contracts; the corresponding second-element review had the same defect. This was prioritized because the false positive affected both independent practice and subsequent retrieval in a core module.

The three contracts now include repeated values and check reference identity at the required input index. The last-element check also passes an actual slice, exercising the published slice signature. The regression suite compiles the same wrong-slot implementations against the historical and current contracts and accepts distinct correct implementations. The public exercise contracts and progress IDs remain stable: historical successes describe their original test runs and are not retrospective verification of the new duplicate cases. This audit verified the catalog and authored execution paths; retention and the quality of individual design justifications still require observation of learner work.

## Five exercise contracts tightened after the follow-up audit, 19 November 2026

The percentage exercise now accepts every integer in the inclusive range from 0 to 100 in its Rust tests. The iterator pipeline must preserve a nonmonotonic sequence of UTF-8 byte lengths. The log-filter exercise and the scheduled parcel review compare every returned view with its specific input occurrence, including equal text stored in different strings. The even-count exercise calls the function with an interior slice of an array.

Regression tests run each previously accepted incorrect implementation and its reference solution against the registered exercise. Four incorrect programs fail a behavioral assertion. A function restricted to a borrowed Vec fails to type-check at the slice call. The lesson and review IDs stay stable, and earlier learner attempts retain their original meaning.

## Learner-authored tests for the first even value, 19 November 2026

A follow-up inspection compared the testing module's guided exercises, scheduled practice and final blank assessment. The final assessment asks learners to write a test suite for finding the first even number. We prioritized it because learners could receive credit for their test design while omitting empty input entirely or while never searching past an odd first element. Both incomplete suites passed the previous Rust evaluator.

The learner now chooses concrete values for four explicit situations. The evaluator runs the learner's suite against a correct implementation and includes separate incorrect implementations for returning zero on empty input and looking only at the first element. Existing checks still distinguish first from last, a match at the start, and a nonempty list with no match. Regression tests omit each required situation individually and accept a complete suite with different data from the published solution. Existing progress IDs and the historical lesson projection are preserved.

## Independent numeric and Unicode regression practice, 19 November 2026

The regression lesson promised two independent test tables, but the module checklist accepted either one. A repeated success on the temperature exercise could satisfy the combined criterion without any text exercise, and a normalization success had the same effect without any numerical boundary practice. This affected the module's completion decision, so it took priority over individual review prompts.

The checklist now reports the two skills separately. Existing attempts keep their original step IDs and count toward their corresponding skill. All four routes declare the Rust test evidence they accept, including compatibility with the original two tasks’ pre-versioned results. An imported event explicitly labeled with an incompatible evaluator cannot satisfy either criterion. Each skill has a fresh blank exercise after the original lesson steps: a booking window with four one-day boundary shifts, or a Unicode tag formatter with casing and whitespace regressions. Learners choose their own test data. The original normalization exercise now also challenges asymmetric trimming and loss of interior spacing. Viewing one solution leaves an independent opportunity for that same skill.

The regression suite covers partial and complete module progress, repeated attempts, assistance, restored progress and independent solutions for the alternatives. Historical projections preserve the catalog from before the split.

## Learner-authored tests in scheduled reviews, 19 November 2026

After the regression lesson gained separate numeric and Unicode criteria, the audit followed learners into the testing module’s three scheduled coding challenges. Seven incomplete suites passed even though each omitted a case requested in its prompt. This mattered for retrieval practice: success on these challenges was an unreliable signal that the learner could independently select the required cases.

The parity review now checks negative odd numbers, zero, negative even numbers and positive odd numbers separately. The discount review distinguishes the last full price (100) from the first discounted price (101), even if the learner also tests a higher discounted price. The occurrence review distinguishes an empty list, one match, multiple matches, absence in a nonempty list and finding the value zero. A single well-chosen input can still cover more than one behavior. The grader runs the learner’s helper against a correct implementation and faulty variants. Learners can choose their own inputs wherever the contract does not specify an exact boundary.

Native regression controls omit each required case in turn and accept independent and reference suites. The three prompts keep their exercise and concept IDs; the historical catalog retains the original evaluator for each review. Previously recorded attempts remain evidence of their original runs.

## Catalog-wide review of instructions and assessment, 19 November 2026

The audit covered the registered sequence of 51 modules, 204 lessons and 1,367 steps, the ordinary and alternate review registries, and the instructions shipped with all 16 downloadable projects. Reviewers compared prompts, prerequisites, solutions and grading criteria. For suspected grading defects they ran plausible incorrect solutions against the authored checks and tested the corrected contract. The changes affect 14 steps in eight lessons, 17 ordinary review exercises and six project downloads.

- Three ownership reviews now accept explanations in the learner’s own words. The learner compares a saved draft with explicit criteria and chooses the next review interval. This records a self-assessment. Independent coding and delayed retrieval still require their own evidence. The struct review asks learners to construct a record whose owned name survives changes to the source text. The Rust test reads the field after the source goes out of scope. The tuple-copy review asks for the output its evaluator checks, and the loop and closure reviews cover previously missed numeric boundaries.
- The I/O exercises check that the writer flushes the full prompt before the first read, that the next message remains available and that I/O errors propagate. The byte limit includes a carriage return before newline. The log exercises distinguish borrowed input from equal text at another address and cover the timestamp grammar and report values. The atomic reviews distinguish a separate store from the required compare-and-exchange operation and reject mixed conclusions from memory-ordering evidence.
- The public API exercises check a literal byte limit, non-ASCII input, calls through a trait object and both outcomes of predicates. The dependency exercises distinguish a source change from a version change and check advisory and release decisions when individual prerequisites are missing or an exception has reached its expiry.
- The downloaded Miri project describes stable Cargo commands that work from the extracted directory. Two other projects explain how to prepare the locked dependencies before the first offline run. The Number Guessing instructions agree with the archive’s exact dependency version. The FFI, Miri and property-testing downloads render inline code and command blocks as intended.

This was an audit of course materials and executable examples. The regression cases identify specific incorrect implementations. They do not exhaust every possible learner program or concurrent execution. Learning outcomes and retention still require observation of learners.

## Final independent-practice audit after 02b6126

The starting catalog contained 51 modules, 204 lessons, 1,367 steps and 204 review variants. We checked all 240 module criteria and their 475 task references, then compared visible worked programs with assessed implementations. For suspected grading leaks we compiled the actual demonstration or starter against the independent task’s own Rust tests. We also exercised evidence and recovery selectors with partial, assisted and restored progress.

- Worked programs now teach a related operation before the learner writes a fresh implementation. Examples include the foundations percentage assessment, Todo, Cargo module boundaries, lending iterators, Tokio and macros. The examples still execute. Native controls check that copying them cannot complete the corresponding transfer tasks.
- In Todo and Todo I/O, some later starters deliberately provide complete prerequisite components. Displaying a supplied implementation records help for the corresponding earlier exercise. A learner’s own draft is preserved. A clean success earned before the disclosure keeps its original credit. In a combined task, seeing the state implementation affects state evidence while the learner can still independently demonstrate session behavior.
- Module completion now checks the evidence kind and evaluator of ordinary tasks as well as versioned tasks. When a criterion has alternatives, the map points to an eligible exercise or explains when all alternatives have already been assisted. Returning to a lesson for practice stays available.
- Four criteria now require the behavior their labels promise. A Rust repair of a moved value replaces a diagnostic answered by printing a constant. Boxing a single value, interpreting a sequential schedule and reserving quota remain exercises. The corresponding recursion, publication-evidence and game-round criteria now offer fresh tasks on collecting tree leaves, checking batches of publication reports, and modeling a bounded round with explicit win and loss states.

A production browser check exposed another problem in recovery: some criteria offered a second task whose complete solution was identical to the one just shown. A catalog-wide regression now opens the first solution of each of the 192 ordinary criteria that offer alternatives and checks that independent work is still available. It covers both restored progress and a newly displayed solution. We added 19 transfer exercises across Todo, performance measurement, profiling, the FFI boundary, and service operations. Together they restore a fresh route for 31 criteria. Examples include atomic batch edits of a Todo board, reasoning about a measured workload under a new budget, and replaying a service lifecycle through readiness and drain. A transfer can satisfy two related criteria when executable tests establish both behaviors.

A second comparison looked for different source programs that still satisfied a sibling's tests. Examples included the two ownership repairs that borrowed a message, an error-propagation scaffold that already classified the earlier parser's errors, a macro solution differing by a trailing newline, and the profiling instruction record. Recovery now directs learners to other assessed behaviors such as borrowing a string to test whether it is empty, evaluating ordered macro arguments exactly once, or attaching a line number to a typed error. The Miri lessons distinguish supplied prerequisite implementations from the new borrowing behavior the learner must write.

The new catalog has 1,391 steps. The comparison covers authored software and specified assessment behavior. The tests do not measure real learners’ retention, and the application can only attribute assistance it can observe.

## Recovery after revealing a solution in the remaining criteria

At commit `ea82ec2`, the earlier first-solution test covered 192 of 240 module criteria. This audit exercised the other 48 individually. Of the 23 criteria with one listed task and the 25 requiring a count of independent coding tasks, 36 could become unattainable after a single solution reveal. In some counted criteria, several listed tasks shared the same implementation. In the MutSlot lesson a worked prerequisite could also disclose a family needed later.

The catalog now contains 1,424 steps in 204 lessons. There are 33 additional Rust exercises and three newly connected existing exercises. The existing exercises cover settlement during shutdown, diagnosing a selected dependency graph and reborrowing a mutable pair. New contracts include preserving an exact borrowed configuration value, checking a batch of requested grant restrictions, planning retry windows under a deadline, draining admitted messages after closing a Tokio receiver, and independently verifying evidence for a release decision.

For each of the 48 criteria, the regression opens each listed solution in turn, submits that assisted task, and follows the actual recovery recommendation through the full quota. It also repeats the check with a restored reveal flag. Where the criterion requires a supplementary rubric, coding alone leaves that criterion open. A six-registry comparison reconstructs the catalog at `ea82ec2` and checks the hashes captured before the edits. This audit covers one disclosure at a time. A learner who reveals every available family can still exhaust the independent routes.

## Returning to independent practice after revealing any variant

At `f3a0081`, the 192 criteria in the first-solution audit offered 429 criterion–task combinations. We checked each variant as the learner's first disclosure. Of those combinations, 426 had a solution the coach could display. The other three used choice-only steps, for which we checked restored progress with a reveal flag. The regression also submits the disclosed task, returns directly to earlier tasks supplied by that solution, and follows the map to fresh work after exporting and importing the learner's state.

Some later exercises supplied enough code to pass an earlier assessment. For example, the reset method included the entire counter needed by the increment task. The readiness replay contained both predicates missing from the accounting starter. The same issue affected Unicode text operations, channel backpressure, allocation measurements, Tokio blocking work and fuzz-oracle comparisons. The course now records which earlier answers these examples show. A learner keeps credit earned independently before seeing them.

Seven new exercises provide independent practice: count occurrences of a Unicode scalar, append a sequence of text fragments with separators, retain an unsent channel message in a retry queue, classify a batch of allocation reports, transform owned values on Tokio's blocking pool, report every mismatching fuzz case and track drain completion by job ID. The counter lesson already had a suitable repair exercise. Native Rust tests check copied implementations against the affected contracts and check the new exercises with correct and deliberately incorrect submissions.

The updated 192 criteria have 438 criterion–task combinations. Each regression starts with one disclosure, including when that disclosure is the last variant in the lesson. The catalog now has 1,431 steps in 204 lessons. A separate comparison reconstructs all six registries at `f3a0081`. These checks cover observable assistance and executable behavior. They do not estimate learning time or measure retention.

## Finding fresh practice after several disclosures

At `d7dee3b`, the 240 criteria offered 497 distinct subsets of two or more tasks within a criterion. For each subset, the regression compares the map recommendation with the credit a successful submission of each candidate would actually earn. It repeats this comparison with coach disclosures, restored flags and a mixture of the two, then follows the recommendations until the criterion is complete or the learner has used every eligible task.

The ownership map now recognizes when two exercises share a coding task even in an ordinary criterion. An older save can also record that a prerequisite implementation was shown inside another module. The map and the assessment use that information when deciding which part of a combined task can still earn credit. For example, seeing Todo state management in the storage lesson still leaves room to demonstrate session handling independently. Credit earned before disclosure is preserved.

A counted criterion can have one fresh exercise left while still needing two independent successes. The map offers that exercise. Exhaustion is reported for the affected criterion, so a learner can still follow links for other criteria in the same module.

## Disclosures across module boundaries

The audit after `758c4a2` found that four split-buffer solutions in FFI pass all four corresponding Miri contracts, and vice versa. Native Rust controls verify all 32 directions, including implementations written differently. Revealing one of these solutions now leads to the distinct envelope exercise in FFI or the two-range exercise in Miri. A hint or an incomplete starter leaves those implementations available.

Across the course, regression tests cover all 16 declared starter links and all 48 solution links from a lesson in one module to an exercise in another. They include a generic byte-length function shown in the conversions lesson and prerequisite implementations shown in Todo I/O. The Todo CLI starter archive also contains the complete parser and state model. Opening it records help on five earlier tasks while preserving fresh command, board, session and I/O practice.

Additional controls compare the map, gate and evidence summary after import, keep independent successes earned before disclosure, and exercise the actual coach and module picker in the browser. The ownership exercises now test their existing unit-returning display API so that an unrelated formatter returning a string cannot pass by discarding its result. These checks concern visible authored implementations and observable progress records.

### Project archive disclosures after `3bb18b7`

The audit compared the files in each starter and solution ZIP with the decisions required by the lesson exercises. A completed implementation in a starter test, example or design note can disclose an answer. A signature, unfinished function or specification can leave the implementation to the learner.

| Project archives | Evidence affecting independent practice |
| --- | --- |
| Number Guessing, Log Analyzer, Tokio Pipeline | The starter contracts leave the assessed implementations open. The reference solutions retain their existing task mappings. |
| Concurrency Lab | The starter ADR already explains conditional compare-and-swap reservation and release/acquire publication. Separate RMW, retry instrumentation and model-analysis exercises remain available. |
| Tokio Service | Lending, callbacks and ownership examples are present in the starter. The solution adds frame reading, frame writing and permit ownership. Independent practice includes receiving a bounded frame on an owned TCP connection and deciding when to discard that connection. |
| Frame Protocol | The starter includes completed Cargo manifests. The API implementations appear in the solution. The maintenance exercises still require learner decisions. |
| Mini Grep, Property Contracts | The Mini Grep starter includes the fuzz decoder and equality oracle. Seeds and campaign records leave reduction and evidence classification open. Property Contracts leaves the custom shrinking and metamorphic checks to the learner. |
| FFI Buffer, Miri Safety | The opaque FFI buffer supplies ownership and checked views. Splitting mutable regions and decoding tagged records are separate tasks. The Miri starter supplies a mutable reborrow. The solution includes range selection and lazy initialization. New independent exercises isolate a pivot element and move a value between two slots while preserving both on refusal. |
| Service Operations | The solution supplies admission limits, correlated selection and readiness/drain predicates. The incident drill gathers evidence. Implementing the ordered diagnosis classifier still requires independent work. |
| Durable Log Service, Durable Log Retry | The retry starter includes completed code from the parent capstone. Its own retry client remains unfinished until the solution is opened. |
| Service Authorization, File Schema Evolution | The starter leaves authorization operations and schema normalization unfinished. The solutions supply those operations. Atomic authorization batches and independent snapshot validation retain separate requirements. |

The all-archive regression includes Todo CLI as a control. For both ZIP variants it compares shipped file contents with the preview, checks that reopening records help once, and evaluates earlier and later submissions separately. Across all module criteria it checks the first recommendation. For affected criteria it follows recommendations through the required quota and supplementary work to actual gate completion. Reopening a package after restoring a flag-only save records the observation at the time of reopening.

### Cumulative archive use after `96ca8d5`

The map audit covered both variants of all 16 projects. It checked every ordered pair of distinct archives (960 starter/solution sequences), including the shared code in Durable Log Service and Durable Log Retry. These sequences produced 226 distinct sets of disclosed tasks. For each set, a simulated successful submission on the first recommendation earned credit in each of the 240 criteria (54,240 checks). The course-wide tests follow recommendations on a single saved history across 51 modules and 240 criteria. They complete the modules in curriculum order, in reverse order, and with archives opened between already completed modules. An earlier independent result continues to count after later archive help and after export/import.

Todo I/O had a dependency between practice routes. After reading the Todo archive, opening the notebook CLI exercise supplied the notebook codec and storage implementation. A learner who started with the CLI lost the remaining independent route for two criteria. The storage-format lesson now also offers a byte-length-prefixed UTF-8 round trip. The file-persistence lesson offers conditional replacement of an on-disk text file, with explicit handling for a stale draft and an existing staging file. Both exercises can be completed after viewing the notebook implementation.

Imported attempts on an equivalent Service Operations exercise now use the same dated disclosure when deriving independent competency credit as when grading the module gate. A completed delayed recall also retains its credit when an import lists older evidence after the recall. Timestamps determine the history preceding a submission, with journal order breaking ties at the same millisecond.

### Assistance history after `8fca024`

A restored Vec exercise could count as independent in competency and mastery after the learner had already used a hint on that task. The module gate correctly required another variant. These views now use the dated history of help. A hint after an independent pass preserves its credit. A hint before a pass follows the exercise and aliases of its assessed coding contract. A different contract remains available for independent practice.

New lesson records distinguish each hint level from a solution reveal. Older generic lesson help counts as at least one hint when its depth is unknown. Reviews match reminders to the exercise and session, including the historical concept-based identifier. Within a single millisecond the order of journal entries determines whether contact preceded recall. Restoring a save keeps the original events.

The local audit checked a hint before and after an otherwise independent submission for all 566 task references across 240 criteria. After prior help, all 566 recommendations pointed to a task with no saved assistance. A later hint preserved every previously credited task–concept pair in the sweep.

### Resuming reviews after a course update

An imported review can refer to a concept or exercise absent from the installed course. The dashboard, navigation badge and review queue count currently available concepts. The original schedule stays in the export. A learner can dismiss an unavailable session, keep its draft and history, and open a current exercise.

Completed reviews can return to the queue even if the save has no matching compiler result. Leaving the result creates no evidence or rating. A short coding probe offers its rating only when the last successful attempt ran the displayed code. Regression coverage includes those recovery paths in the browser and the due boundary for every current concept.

The [20 November cross-course audit](curriculum-audit-2026-11-20.md) covers assessment wording, independent evidence, retention and saved-state recovery across the catalog.
