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
