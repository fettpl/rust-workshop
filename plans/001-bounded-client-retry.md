# Plan 001: Build a bounded client retry-policy laboratory

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` with meaningful test-first checks. The advisor delegates implementation and independently reviews the result. Read this complete plan before editing. The reviewer maintains the index.

**Goal:** Teach implementation of a bounded client policy and preservation of uncertainty across multiple attempts, using an optional local extension of the existing durable-log workspace.

**Architecture:** Add two lessons and a separate client-policy laboratory composed immutably from the accepted durable-log reference. Keep every existing lesson, project, archive and evidence identity unchanged. The browser evaluates small standard-library policy models; an authored Tokio adapter and real loopback tests provide separate native fixture evidence.

**Tech stack:** Existing TypeScript/Vitest/Next.js, Rust 2024, exact MSRV 1.85.0, existing pinned Tokio/SQLite dependencies. No dependency graph changes.

**Spec:** The contract, boundaries, tasks and verification gates below are the complete feature specification.

## Status

- Status: DONE — implementation reviewed, qualified, committed and independently restored locally on 2026-11-04.

- Priority: P2; effort: L; risk: MEDIUM; category: direction.
- Depends on: accepted A9; genuine clean-source registry and synthetic-state captures (completed before this plan).
- Planned at: `12a1e99895c491b58e0ffe0885efc5b3c17e1ea8`, 2026-11-03.
- Branch: `feat/local-professional-progression-nov03` in the prepared isolated repository.

## Global constraints

- Local only. No push, remote/main changes, hosted jobs, publication, deployment, dependency install or fetch. Never mutate sealed predecessor stages.
- English contributor documentation, plans, commits and review reports; Polish learner content. Basic programming knowledge, Rust from zero. No Java/Python experience framing.
- No learning-duration estimates for the new lessons. Technical deadlines and review dates remain meaningful domain data.
- Preserve historical IDs/order, precise resume, drafts, attempts, notes, bookmarks, raw events, dates, reviews and assistance. No imported/revealed/repeated/mocked work becomes independent credit.
- Learner/imported code runs only through the existing remote adapter. Native tools receive only fixed repository-authored fixtures and manifests. No arbitrary source/tool/path arguments.
- Preserve all 13 old project objects and 26 generated ZIPs byte-for-byte. Add one optional client-policy lab. No new receipt-query protocol, wire-version meaning, public listener or security claim.
- No production UI redesign. The only presentation support here is omitting duration fragments when new lesson metadata has no estimate.
- Reference availability and automated tests do not establish learner attainment, seniority, production readiness, cryptographic security or global OSS clearance.
- Heavy checks run serially. Reports distinguish executed, simulated, inherited, skipped, failed and infrastructure-limited evidence.

## Why this matters

The capstone already teaches server-side idempotency, replay and recovery. Its current client makes one attempt, while its runbook asks for bounded retry without an executable client budget. Implementing a policy across attempts adds a different responsibility: limits, immutable request bytes, terminal decisions and uncertainty that survives later rejections. Do not add another generic Unknown explanation or duplicate release dossier.

## Current state and conventions

- `src/content/projects/durable-log-service/service.ts:744-812` contains the one-attempt V1 client. It creates one Event/frame, connects, writes and reads. Its `write_all` is not covered by the read deadline; do not copy this limitation into the new adapter.
- `service.ts:577-610,648-657,836-875` defines the actual response vocabulary. Successful responses are `OK\t<positive u64>\tINSERTED|DUPLICATE\n`. Errors are `QUEUE_FULL`, `BUSY`, `CONFLICT`, `FULL`, `SCHEMA`, `STORAGE`, `TOO_LARGE`, `UTF8`, `VERSION`, `FIELDS`, `VALIDATION`.
- The old client's recognized ERR list omits `TOO_LARGE`. Preserve the old client unchanged; explicitly test/document the new typed parser's behavior and the old fixture boundary.
- `src/content/projects/durable-log-service/archive.ts:512-527` describes same-identity replay, queue/store overload and Unknown. There is no receipt-query command.
- `src/content/projects/durable-log-service/package.test.ts:13-43` proves the 40-file A8 archive. `projectFiles` in `src/domain/project-package.ts:103-117` selects starter/solution strings. Compose new objects; never mutate these original arrays or strings.
- `src/domain/project-package.ts:134-165` applies starter and solution exposure refs. Inheriting old solution files is help for the old families, including from the new starter. Mark it explicitly.
- `src/content/capstone-integration.ts:1001-1045` is the module/gate exemplar. `src/content/unsafe-miri.ts:1320-1435` shows calibrated evidence v2. `src/content/performance-evidence-assessment.test.ts` compiles fixed canonical/equivalent/mutant strings and checks actual test counts and evaluator outcomes.
- `src/content/course.ts` assembles modules/lessons/concepts/competencies/sources/reviews/projects. Append additions while preserving old order. `src/engine/course-route.ts:26-51` contains the concurrency-services extension group; keep Core17 unchanged.
- Existing historical tests use exact registry hashes and composed projections. `src/content/unsafe-miri-mut-slot-with-mut-a9-compatibility-fixture.ts` is the immediate predecessor. New adapters must project only exact authored new records; do not edit old hashes or weaken assertions.
- Lesson `minutes` is currently required (`src/domain/types.ts:161`), validated at `src/content/validate.ts:394-406` and rendered in `src/components/overview.tsx:155-160,560-566`. Onboarding minutes are separate persisted data and stay unchanged.
- Current counts: 48 modules, 196 lessons, 1305 steps, 194 concepts, 195 competencies, 349 sources, 13 projects. Core: 17 modules/74 lessons. These are availability counts, not achievements.

## Drift check

Run `git diff --stat 12a1e99895c491b58e0ffe0885efc5b3c17e1ea8..HEAD -- src scripts package.json .github/workflows/ci.yml` before starting. Expected: no committed implementation drift. Advisor plans are the only initial untracked source files. Confirm genuine captures exist in the private stage research directory; do not rerun or reconstruct them after authoring.

## Public contract

### Policy and certainty

1. Encode one validated Event exactly once. Replay the same bytes, including version and correlation when applicable; never generate a fresh key or mutate payload between attempts.
2. Retry `QUEUE_FULL`, `BUSY` and transport/connect/write/read/deadline uncertainty only within the declared attempt and time budgets.
3. Do not automatically retry malformed/unrecognized replies, `STORAGE`, validation/protocol failures, `CONFLICT`, `FULL` or `SCHEMA`.
4. A valid receipt on the request's connection is the only success. There is no invented receipt lookup. INSERTED and DUPLICATE both confirm delivery under the existing server contract.
5. Keep an aggregate unresolved-ambiguity flag. Unknown followed by BUSY, QUEUE_FULL, terminal error or exhaustion remains Unknown. Only a valid receipt resolves it. In particular, broad STORAGE is terminal uncertainty even without a prior lost response; do not infer rollback from it.
6. Distinguish why attempts stopped from what is known about the request. Zero attempts due to invalid policy/deadline is not a successful or rejected server operation.
7. Validate nonzero attempt/per-attempt budgets and positive backoff. Stop at `attempts >= max_attempts` or `now >= deadline`. A delay reaching the deadline leaves no next attempt. Use checked arithmetic for backoff and deadline construction; overflow stops explicitly.
8. Recheck the shared deadline after every sleep and before I/O. All connect/write/read phases share `min(global_deadline, per_attempt_deadline)`; do not restart the duration for each phase. Drop an uncertain stream before replay on a fresh connection.
9. Use injected deterministic clock/transport tests for policy boundaries. Real TCP/SQLite tests separately prove actual fixture integration. Deterministic backoff is a bounded single-client teaching choice; document the retry-storm/jitter boundary, without claiming a production fleet policy.

### Closed final-result algebra and precedence

The browser models and native adapter may use domain-appropriate names, but MUST implement this same four-way result and truth table. Observing an ERR and proving durable effects are separate claims.

```rust
// Receipt is the parsed positive sequence and Inserted/Duplicate disposition.
// Refusal excludes STORAGE. LastObservation covers receipt/error/transport/
// timeout/malformed/unrecognized without echoing payload or credentials.
enum StopReason { Terminal, AttemptLimit, Deadline, BackoffOverflow, InvalidPolicy }
enum Final {
    Delivered { receipt: Receipt, attempts: u32 },
    Refused { reason: Refusal, stopped: StopReason, attempts: u32 },
    Unknown { last: LastObservation, stopped: StopReason, attempts: u32 },
    NotAttempted { stopped: StopReason },
}
```

`attempts` counts attempts STARTED, including a failed connect. Validate the whole policy before starting; a zero budget or zero per-attempt/backoff duration is InvalidPolicy with no I/O. No valid observation exists in NotAttempted. Refused means a recognized explicit refusal for the attempted request with no unresolved earlier ambiguity in this fixture; it is not a universal database rollback guarantee.

| Observation/history | Final result / next action |
|---|---|
| Invalid policy before first attempt | NotAttempted(InvalidPolicy), zero sends |
| Deadline already reached before first attempt | NotAttempted(Deadline), zero sends |
| Valid INSERTED/DUPLICATE receipt | Delivered, even after prior uncertainty |
| First/all BUSY or QUEUE_FULL, retry budget remains | Schedule next attempt with the same frame |
| Only BUSY/QUEUE_FULL seen, attempt/time/backoff budget stops | Refused(last refusal, corresponding stop reason) |
| Terminal recognized refusal, no previous uncertainty | Refused(reason, Terminal), no retry |
| STORAGE on any attempt | Unknown(last=Storage, Terminal), no automatic retry |
| Transport/deadline uncertainty, budget remains | Retain uncertainty and schedule bounded replay |
| Transport/deadline uncertainty, budget stops | Unknown(last observation, corresponding stop reason) |
| Prior unresolved uncertainty, then BUSY/QUEUE_FULL/terminal refusal and stop | Unknown(last observation, corresponding stop reason), never Refused |
| Malformed/unrecognized response | Unknown(last observation, Terminal), no automatic retry |

A valid receipt obtained by an already-started bounded attempt remains a factual confirmation; bookkeeping after it must not erase that receipt merely because the clock advanced. Budgets govern starting/waiting for attempts, not undoing observations. Prior uncertainty is sticky until a valid receipt; a later explicit refusal cannot erase it. For an attempt that times out before observing a complete valid receipt, the observation remains Unknown.

Every row needs a named test in the model/native suites. Add mutation controls specifically for the all-BUSY exhaustion result, zero-attempt dispatch, STORAGE-as-rejection and prior-Unknown-to-Refused mistakes. Negative compile/infrastructure outcomes do not count as these semantic mutations being rejected.

### Two lessons, four primary coding families

Module `service-client-retry`, prerequisite module `capstone-integration`.

- Lesson `service-client-bounded-retry`, concept `service-client-retry-policy`: family `service-client/retry-next-action-v1` implements semantic next-action policy; family `service-client/retry-budget-reservation-v1` implements a typed budget/deadline/backoff reservation. These must test different operations, not renamed copies of one predicate.
- Lesson `service-client-ambiguous-driver`, concept `service-client-ambiguity-contract`: family `service-client/immutable-frame-replay-v1` implements a standard-library callback-driven replay model; family `service-client/aggregate-uncertainty-v1` implements receipt/ambiguity aggregation over a different interface. Browser models do not run Tokio or prove TCP behavior.
- Each concept uses evidence calibration v2, minimumCodingTasks 2. Give each lesson 5-9 well-scaffolded steps covering prediction, executable model, observation/explanation, modification/debugging, separate recall, application and blank-page work. Combine adjacent observation/explanation if needed. Preserve the established teaching cycle without a long wall of policy prose.
- Two primary test-backed coding gates per lesson. Apply/blank variants may share their correct primary family; repeated forms do not create additional credit. Recall/reviews are distinct retrieval tasks and do not add primary families.
- Include independent review exercises and appropriate short/delayed retrieval using current conventions. Explanatory rubrics stay self-rating; examples stay exposure. All calibrated steps/reviews must carry valid evidence metadata.
- New lessons omit `minutes`. Keep all 196 old lessons' exact metadata unchanged.

## Scope and ownership

Task 1 executor owns:
- New `src/content/projects/durable-log-retry.ts` and `src/content/projects/durable-log-retry/` authored package strings, project tests and trusted-native tests.
- New `scripts/verify-client-retry.ts` and its tests, plus an explicit include in `vitest.config.mts` if tests live under scripts.
- `package.json` script additions only; `.github/workflows/ci.yml` two explicit stable/MSRV verifier invocations only, after existing capstone/cache preparation. Preserve action pins, permissions, triggers, existing commands and test regex contracts. These are local file edits under the standing CI authorization, never hosted execution.
- `scripts/project-archive.ts` and `scripts/project-archive.test.ts`: add ONLY the derived `durable-log-retry-workspace` notice mapping and corresponding tests, carrying the Apache notice for the unchanged inherited durable Cargo manifests. Do not change canonical license/scope/notice documents or any old archive mapping.
- `src/domain/project-package.test.ts` current-catalog assertions only: 14 downloadable packages and four archive IDs carrying Apache notices (three original manifest sources, one derived lab). Preserve all original payload/notice assertions and add exact inherited-source mapping. This is a current availability test, not a historical snapshot.
- New `docs/client-retry.md`; final scoped README addition and provenance ledger refresh after all source authors finish.

Task 2 executor owns:
- New `src/content/service-client-retry.ts`, contracts/fixture/assessment/integration files using that prefix.
- `src/content/course.ts` append-only catalog composition and `src/engine/course-route.ts` extension-group append. Update `src/engine/course-route.test.ts` CURRENT-catalog expectations to 49 unique total / 32 extensions and exactly one appended concurrency module; preserve the exact Core17 and every old extension entry/order. This test intentionally tracks current availability, unlike protected historical registry consumers.
- `src/domain/types.ts` Lesson.minutes optional only; `src/content/validate.ts` finite-positive-if-present rule; `src/components/overview.tsx` two conditional duration fragments; focused validation/render/browser coverage.
- New `src/content/service-client-retry-compatibility-fixture.ts`, projection fixture and tests. Historical `src/content/*.test.ts` consumers may change ONLY import/wrapper composition to prepend exact A10 projection; preserve old fixture data, counts, hashes and assertions. Document every such path in the diff report.
- `tests/` one focused new lesson/package learner-flow spec using established patterns; no broader redesign.

Advisor owns `plans/README.md` and this plan. Native executor commits the reviewed final coherent feature, including the advisor plans, after all gates. No implementation commit before independent review and final verification.

Out of scope: every old lesson, old project package, old archive bytes, persistence/migration/evidence rules, runner security, dependency versions/lockfiles, global UI redesign, new hosting/security/authentication/receipt protocols, historical test expectations or sealed receipts.

## Commands and expected results

Use the qualified Node and Rust tools from private preparation metadata; public commands below assume their qualified directories are on PATH. Keep Cargo offline and use the owned Cargo home and separate owned targets. Do not install missing tools.

| Purpose | Command | Expected |
|---|---|---|
| Package generation | `npm run content:packages` | 28 ZIPs; all old 26 SHA-identical |
| Focused policy/content tests | `node node_modules/vitest/vitest.mjs run src/content/service-client-retry-integration.test.ts src/content/service-client-retry-assessment.test.ts src/content/service-client-retry-compatibility.test.ts` | no failures/skips; actual fixed Rust controls |
| New native proof | `npm run content:client-retry` | actual stable authored fixture checks and mutation controls pass |
| New MSRV proof | `npm run content:client-retry -- --msrv` | exact 1.85.0 authored checks pass, no install/fetch |
| Static | `npm run lint`; `npm run typecheck -- --incremental false`; `npm run content:check`; `npm run content:audit`; `npm run content:manifests` | each exit 0 |
| Full unit | `npm test` with documented qualified initialized-prefix prerequisites | no failures, unintended skips, todos or missing native proof |
| Authored examples | `npm run content:rust` | complete actual ordinary corpus report, no masked infrastructure failure |
| Provenance | `node --test scripts/verify-oss-provenance.test.mjs`; `node scripts/verify-oss-provenance.mjs --check` | exit 0, exact staged tracked coverage |
| Production | `npm run build` | new successful build, actual BUILD_ID retained |
| Learner flow | Playwright focused spec against owned production server, then ordinary suite as justified by surface | real UI/state/download checks; mocked runner only request/UI evidence |
| Offline | `npm run test:offline` against owned production server | fresh neutral exposure and state persistence pass |

The CI file will run future hosted checks only when later authorized; local edits and local success do not establish Actions/main acceptance.

## Task 1: Implement the optional client-policy package

- [x] Write failing package/control tests first. Require original durable package deep equality and every inherited solution file byte-identical in both new variants.
- [x] Build immutable new package id `durable-log-retry-workspace`, project id `durable-log-retry`. Inherit all 40 existing solution files as disclosed reference context in both variants. Add only retry module, optional binary, new tests and `RETRY-LAB.md`. The old README/manifests/lockfile/library/binary remain byte-identical. `#[path = "../retry_client.rs"] mod retry_client;` in the new binary avoids editing old roots; tests use `#[path = "../src/retry_client.rs"] mod retry_client;` from `crates/ingest-service/tests/`. Do not reuse the binary-relative path from the integration-test directory.
- [x] New starter has bounded skeletons for the new work, never a hidden full retry solution. Because it includes old solution context, `starterRevealStepRefs` includes all inherited solution refs. New solution exposure covers all new primary families, including equivalent apply/blank tasks where needed. Test both downloads with actual learning engine helpers: help is recorded, no completion or independent credit is manufactured, existing independent history remains untouched.
- [x] Implement the typed parser, checked policy, aggregate certainty and actual Tokio client. Tests cover every emitted ERR, all receipt constraints, malformed/multiple lines/trailing bytes, invalid/zero sequence, response byte limit, STORAGE uncertainty and the explicit old TOO_LARGE mapping boundary.
- [x] Test max attempts including zero/one boundaries, deadline exactly now, delay reaching deadline, overflow, oversleep/recheck, all I/O phases sharing a deadline, terminal status after earlier ambiguity, and no sends after budget exhaustion. Deterministic fake transport/time is labeled as such.
- [x] Add actual loopback proof with the existing authored service/Store: commit followed by lost response and identical replay yields DUPLICATE with original sequence and exactly one row. Observe sent bytes, and join all tasks/threads on success/failure. Cover QUEUE_FULL/BUSY responses separately; distinguish authored peer/proxy from the real service when used. No fabricated network proof.
- [x] Add compiling semantic native mutation controls: fresh identity on retry, retry after conflict, attempt off-by-one, lost aggregate ambiguity, ignored shared deadline. Require the intended assertion/test failure and positive test counts; compile errors/timeouts/missing tests are infrastructure or invalid controls, never a rejected-mutant pass.
- [x] Add the derived archive notice mapping above. This carries the already-approved durable Cargo exception for the SAME inherited manifests; it is not a new exception or license selection. Retain every canonical notice unchanged, so all old ZIP bytes remain equal. Disclose reference provenance and new MIT executable / CC BY prose regions in the new files and RETRY-LAB.md. Stop if this requires changing a license policy rather than carrying existing notices.
- [x] Snapshot the 26 owned old ZIP hashes before generation, then run `content:packages` only after both executors have completed catalog/package additions. Assert all 26 old ZIPs remain exact and two new ones exist. Standalone native verifier builds its fixed authored archive directly, without requiring app catalog authoring or a package-generation lifecycle hook.
- [x] Implement parameter-closed `content:client-retry` verifier with only optional fixed `--msrv`; reject duplicates, arbitrary paths/source/toolchain/fetch flags before any native work. Use existing closed authored archive/extraction/tool qualification conventions. Record exact archive/source/tool hashes, versions, commands, counts, scope and failed observations. Wire ordinary tests and future CI stable/MSRV calls.

**Verify:** package tests, new verifier tests, stable and exact-MSRV native proof; all pass with preserved old archive hashes. Stop if cache/tool unavailable; no fetch workaround.

## Task 2: Add the lessons, evidence and bounded metadata support

- [x] Write failing integration/evidence tests before content. Assert module prerequisites, exactly two lessons/concepts, two distinct primary families per concept, separate reviews, and route discoverability. Assess canonical, semantically different equivalent and compiling semantic mutant for every new tests-backed authored step/review using actual fixed Rust execution and evaluator output.
- [x] Author the two lessons and four families above. Reuse the existing official `tokio-timeout`, `tokio-tcp-stream`, and `errors-rust-book-overview` source records. The initially suggested AWS article was not added or marked newly reviewed: the page was inaccessible during this work. Summarize in original Polish; do not copy paragraphs. References support the explanations; native tests provide separate executable evidence.
- [x] Append catalog/project entries; add module to concurrency-services extensions. Keep original Core17 and all prior ordering/aliases. Counts become 49 modules, 198 lessons, 196 concepts, 197 competencies and 14 projects; derive steps/source counts from actual content rather than guessing.
- [x] Make Lesson.minutes optional and validate `minutes !== undefined && (!Number.isFinite(minutes) || minutes <= 0)`. New lessons omit it. Both overview fragments must conditionally render clock, value and separator together, preserving step progress without `undefined min` or dangling separators. No onboarding, persisted field or general UI changes. Test undefined allowed, NaN/Infinity/0/negative rejected, all 196 old lesson durations unchanged.
- [x] Using genuine pre-authoring capture, add exact A10 projection: strip only authored additions with complete successor hashes/positions, preserve unknown/unrelated changes and function references, project real and synthetic default namespaces independently, idempotently and without mutation. Restore all 15 predecessor hashes and exact whole-course hash. Then prepend this projection for historical consumers through import/wrapper aliases only; never edit old hashes/assertions. Current lesson/evidence tests always use unprojected current content.
- [x] Compare the three genuine state fixtures after authoring using actual current persistence. Preserve raw history, event dates, attempt dates, help, resume, notes, bookmarks, reviews and route legacy exceptions. Only generated export-envelope dates may normalize.
- [x] Browser test: discover new extension, exact resume on a new task, no duration estimate, help/download behavior for both archive variants, neutral offline exposure. A mocked runner result proves only request/UI/persistence behavior and must not stand in for Rust proof.

**Verify:** focused content/evidence/native model tests, current validation, all historical compatibility consumers, renderer/browser checks and state comparison; no failures/unintended skips and old rows byte-identical.

## Task 3: Qualify and seal one coherent local milestone

- [x] Independently review both task diffs and tests before final campaigns. Resolve concrete findings with scoped re-review; do not rerun complete suites for unchanged evidence-only corrections.
- [x] Refresh exact finite provenance coverage for newly authored/changed content after contextual source review; record limits, not global legal/security readiness. Do not hand-edit generated ZIPs.
- [x] Run fresh static/full-unit/content-Rust/new stable+MSRV/build/browser/offline gates on a frozen exact candidate. Qualify initialized-prefix controls with owned artifact/config/target directories and current tool hashes. Retain all failures and actual exit/counts. Distinguish dynamic Next route-cache warming from source drift; capture genuine build state before/after its declared phase rather than reconstructing it.
- [x] Review the full diff and verify no scope creep, absolute private paths, credentials or notices errors in current sources/new archives. Use synthetic data only. Baseline synthetic public fixture paths remain scoped fixtures, not blanket privacy approval.
- [x] Native executor creates the English implementation commit from the exact reviewed and tested staged tree. Confirm its tree and clean/no-remotes status, then independently restore the complete bundle. Advisor closes this plan only after those results and the local implementation acceptance packet exist. Record closure in a separate English documentation-only commit; do not relabel the tested implementation tree as a fresh run on changed documentation.
- [x] Create complete local source bundle, independently restore it into a new owned directory, verify Git fsck and every byte/size/mode/hash plus clean/no-remotes state. Seal local evidence packet with actual references/SHAs. Do not claim main/Actions acceptance.

## Done criteria

All tasks checked, both independent reviews clean, full required checks actually pass on final candidate, 26 old ZIPs and all old course rows unchanged, no new learning estimates, exact predecessor/state compatibility verified, new native controls meaningful, English commit backed up and restored, no remote/installation action. Record the actual counts and all remaining external limits.

## STOP conditions and maintenance

Stop the dependent task and report a concrete blocker if source drift invalidates these excerpts, old rows/archives must change, missing cache/tool requires install, a gate fails twice without understood cause, code needs arbitrary learner execution, or an out-of-scope dependency/architecture change is required. Continue disjoint authorized work. Do not weaken a gate or fabricate a result.

Future work options, each requiring its own grounded feature plan: application authorization boundary; local file-format migration/rollback; unsafe abstraction marker/auto-trait design. Live advisory refresh, hosting, registry publication and broad OSS integration remain separate external gates. Reconcile the existing extensive curriculum first; a dated roadmap “gap” alone does not justify a duplicate lesson.

## Preflight decision record

- A10-PLAN-001: make the four-way result algebra and boundary table explicit before executor dispatch; an observation is distinct from a final request result.
- Optional duration metadata is a deliberate forward authoring contract. Do not hardcode the two new lesson IDs into the production validator. The genuine predecessor projection plus explicit integration assertions must preserve all 196 legacy lesson values unchanged; future new lessons may also omit estimates. Onboarding data is unrelated and stays unchanged.

- Task 1 preflight clarification: binary/test module paths differ; direct fixed-archive native verification avoids package-generation races. Local workflow file editing is authorized, hosted execution remains held. The derived package carries the unchanged existing durable Cargo license exception and notices; no new license or copyright decision is made.

- Current-catalog test scope confirmation from direct source reads: `src/domain/project-package.test.ts:89-98` and `src/engine/course-route.test.ts:14-90` assert current availability counts. Their exact +1 updates belong to this feature; frozen historical hash/count assertions remain unchanged.

## Local acceptance (2026-11-04)

Implementation commit: `b0a34137c41a657ef06916f5dab87c811881e827` (`Teach bounded client retries and preserve ambiguous outcomes`). Its tree, `2607387b6e9844fb9262085255d12054409870f8`, is exactly the frozen and qualified 639-file candidate. Independent source and result reviews passed; a complete local Git bundle was restored independently with exact bytes, modes, hashes, refs, clean state, no alternates, and no remotes. The private implementation acceptance packet was sealed before this plan closure. Earlier failures and diagnostic campaigns remain retained as failures or diagnostics.

Fresh final verification passed all 16 static phases: 1,848 unit tests, 2,599 authored Rust cases, stable 1.98.1 and MSRV 1.85.0 native checks (32 commands and nine compiling semantic-mutant controls per toolchain), typecheck, lint, content/source/manifests/provenance checks, and production build. Full browser execution passed all 199 discovered tests in 43 files, once each, with no skips or flaky results. Formal offline verification and the additional retry offline case passed. Source custody remained exact throughout; the owned browser server and temporary idle-prevention assertion were released.

Current catalog: 49 modules, 198 lessons, 1,323 steps, 196 concepts, 197 competencies, 349 source records, and 14 projects. All 15 predecessor registry fingerprints, three state fixtures, 196 old lesson durations, 13 old project objects, and 26 old ZIP archives were preserved. The two new lessons omit learning-duration estimates.

This closure changes only the two plan Markdown files. Automated execution evidence belongs to the implementation commit above; the final documentation closure receives a separate scope/metadata review and backup, without claiming a new full-suite run on its changed tree. This is one feature for one eventual PR. Push, remotes, main integration, hosted Actions, installation/fetch, deployment, publication, and the separate global UI redesign remain outside this local acceptance. Automated checks do not establish learner attainment, professional readiness, or general legal/security clearance.
