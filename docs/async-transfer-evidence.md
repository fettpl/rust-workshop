# Async transfer evidence — 9 October 2026

This M11 source candidate appends two primary coding families inside the existing async lending lessons. It retains the accepted M10 identities, concept minimums, schema 3 and assistance semantics. Source integration and observed maintainer fixtures are distinct from whole-branch review, production browser/offline execution, natural PR/main checks and local release acceptance; those coordinator gates remain pending for this candidate.

## Contracts and independence

`async-lending-callbacks-bounded-transform` implements `transform_up_to`: the limit counts input records, including filtered records, and each successful callback commits one input only after await. Output consists of owned Strings in a Vec. On Err, earlier commits remain while that invocation's accumulated output is dropped; the failing and later inputs remain. Dropping while Pending keeps that current input uncommitted, but prior commits and callback effects remain. This differs from `run_sequential` through bounded input accounting, filtering, owned output and repeated partial progress. There is no generic rollback or allocation-free promise.

`async-lending-dyn-adapter-borrowed-sources` implements reusable indexed `BoxedSources` over heterogeneous local `BorrowedProvider` values. Its future and byte slice borrow the mutable receiver; constructing or dropping an unpolled adapter invokes no provider. `next_at` forwards polling/wakers and the borrowed bytes. `collect_at` explicitly copies bounded results into owned Vecs, releases each view before reuse and preserves empty items. The provider defines progression and cancellation; the adapter adds no transactional lease or rollback. Unlike one-shot `Boxed::one(self)` with an owned Report, this contract requires repeated routing and a separate borrow-to-owned boundary. Boxed futures and collection results can allocate; tested pointer identity is a bounded observation, not a theorem about all allocations.

## Current authored families

| Concept                                       | Primary families available                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Receiver / `async-lending-borrowed-readiness` | `async-lending/receiver-lease-v1`; `async-lending/receiver-bounded-batch-v1`          |
| Callback / `async-lending-callback-borrow`    | `async-lending/sequential-callback-v1`; `async-lending/callback-bounded-transform-v1` |
| Dyn adapter / `async-lending-dyn-adapter`     | `async-lending/dyn-adapter-v1`; `async-lending/dyn-borrowed-sources-v1`               |
| Cancellation/commit                           | `async-lending/cancel-commit-v1`                                                      |
| Send                                          | `async-lending/send-boundary-v1`                                                      |
| ByteView                                      | `unsafe-miri/byte-view-v1`                                                            |
| Disjoint regions                              | `unsafe-miri/disjoint-regions-v1`                                                     |
| Slot                                          | `unsafe-miri/slot-state-v1`                                                           |
| MutSlot                                       | `unsafe-miri/mut-slot-v1`                                                             |

Three of nine advanced concepts now have two authored primary families; six remain single-family. Availability is not learner confirmation. Gate and blank alias one family, ordinary recall adds no primary family, and concept confirmation still requires two eligible clean current families. Old assisted plus new clean supplies only one eligible family; both helped may exhaust available recovery. Prior raw clean events remain intact after later help. Module criteria accept one independent family each, which is distinct from concept confirmation; no exact-pair engine restriction was added.

Registered definitions supply family IDs. Saved schema-3 events have no `codingTaskId` field, and strict import rejects that unsupported field. Wrong current attribution/evaluator/kind cannot earn primary credit. An otherwise valid transfer with optional `gate: false` still qualifies under the preserved engine; a gate flag cannot promote exposure, prediction, answer-only or recall into a primary family. Recall retains its separate review/retention role.

## Inventory and compatibility

The frozen accepted M10 projection records main `eb7ae8be22cef252f6a74c09023b4d56a0c179cc`, tree `3503a34bba8ce693f4398ec30e826ecf50fc46ba`. The committed fixture is a byte-identical copy (609,568 bytes; SHA256 `59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7`). Tests compare every old lesson-qualified step occurrence/index and all bare-ID location arrays, including all 24 duplicated bare IDs. Only callbacks and dyn-adapter receive one end-append each.

Observed integrated inventory: 189 lessons, 1,219 step occurrences (M10: 1,217), 1,188 unique bare step IDs (M10: 1,186), 48 modules, 191 concepts, 195 competencies, 13 projects, 334 sources and 7 traces. Reviews remain 191 ordinary, 2 delayed, 3 short and 196 combined identities. Async assessment coverage is 18: 13 lesson coding assessments and 5 reviews, with every old fixture string and relative order preserved. No lesson, review, module, concept or project was added.

## Native execution and compiler negatives

The integrated Vitest native harness assembles behavior sources with the real `appendHiddenTests` helper and invokes bare `rustc` under recorded PATH selections. Node is 22.23.3. Selected stable is Homebrew Rust 1.99.0 (`b940084d7eb6a299eb4bfeb8e34901bc051e7ac4`), not the separate installed rustup-stable 1.98.1 alias. Exact MSRV is Rust 1.85.0 (`4d91de4e48198da2e33413efdcd9cd2cc0c46688`), with its compiler directory first in PATH. All new sources use edition 2024 and `--test`.

| Observed fixture scope, on each compiler                    | Callback                                               | Dyn                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Canonical and representation-diverse equivalent compile/run | 0 / 0; 8 tests each                                    | 0 / 0; 7 tests each                                    |
| Compiling semantic mutants                                  | 5 compile0; designated run101; restored canonical run0 | 6 compile0; designated run101; restored canonical run0 |
| Negative/pass boundary pairs, canonical and equivalent      | 2 pairs each                                           | 6 pairs each                                           |

Every designated mutant and pass twin uses `--exact <actual-name> --test-threads=1 --nocapture`, requires exactly one named test, and checks ordinary exit status. Several separate mutant binaries intentionally target the same assertion. Mutation rejection requires a named assertion failure, never compilation failure, missing compiler, timeout, signal or zero selected tests.

Boundary negatives use `--error-format=json`, require ordinary exit1 and the intended E-code on a primary span in the appended witness. Callback pairs check local operation/static (`E0597`) and local Rc/Send (`E0277`). Dyn pairs check live future overlap and slice overlap (`E0499`), borrowed output/future escape (`E0515`), provider Send (`E0277`) and local provider/static (`E0597`). Every positive twin compiles0 and executes its exact named test0 for both canonical and equivalent. These are authored fixture boundaries, not an arbitrary-code theorem.

Appended hidden-test source identities are identical across the selected compiler runs:

| Source / implementation                                   | SHA256 of assembled Rust                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `async-lending-callbacks-bounded-transform` / canonical   | `06ff0eb82222fd42a193a5975659d8a8292ec0e6f60c1d0879e8f8e805f356f5` |
| `async-lending-callbacks-bounded-transform` / equivalent  | `447da1bf7fd7385417c4e5eedb0434a631c5649c46a9c43338ffa043eeccbd7f` |
| `async-lending-dyn-adapter-borrowed-sources` / canonical  | `24ab9507714655b7fcfd7498512599be4dedebd0d28c30ca86c533ca798d0dc9` |
| `async-lending-dyn-adapter-borrowed-sources` / equivalent | `57fbabe28416187cd6b6428219d2013efb292e253b23cc18516d48552cffc583` |

Canonical/equivalent full behavior tests observe controlled Pending, the supplied waker, local captures/providers, byte forwarding, bounded/repeated progress and cancellation within the stated contracts. The integrated stable targeted run passed 136 tests in five files; the separate exact-1.85 native run passed 36 tests in two files. The full `content:rust` verification is a separate command scope. `content:async-lending` alone verifies the authored package and does not execute these two lesson steps.

## Browser, release and human evidence boundaries

The affected containment/resume suites include both appended IDs, schema-3 imports at old indices, exact review/draft preservation, intercepted success request/attribution, reveal containment, assisted-old/clean-new accounting, exhaustion and narrow/mobile module navigation. Intercepted success is UI/state-only and does not execute Rust. Production execution must use a verified fresh coordinator-owned build/server and explicit URL/report overrides; no result from a preexisting server establishes source freshness. Build/browser/offline and natural PR/main/local-release acceptance remain separate gates, not inferred from native/unit success. UTC archive comparison, when executed, is not cross-timezone byte reproducibility; this packet changes no ZIP content or timestamp.

No human learner outcomes were observed. Fixed authored fixtures and mocked browser flows do not establish learner-chosen architecture, delayed unfamiliar transfer, retention, efficacy, general concurrency or unsafe expertise, senior/professional readiness or complete accessibility. Historical M10 statements about eight single-family concepts retain their dated meaning; the current availability is the three-of-nine/two-family table above.
