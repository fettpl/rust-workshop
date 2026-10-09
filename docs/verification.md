> Historical notice: sections retained below preserve their original dated source cuts, counts, evidence boundaries, anchors, pending decisions, and uses of “current.” They are historical records. The snapshot immediately below is the latest accepted release before the committed packet-005 candidate in the current checkout; source provenance, current CI/main and local-release confirmation, and learner outcomes remain separate records.

<a id="latest-accepted-release-before-session-scaffolding-candidate-9-october-2026"></a>

## Latest accepted release before the session-scaffolding candidate

Date: 2026-10-09 (Europe/Warsaw). This dated snapshot records the accepted M8 ordinary-main release before packet 005 session-scaffolding work. The ordinary main head is `54d9f1a1f62840cb7d85f8300cec0ca71a2c60b6`, tree `277104d82e7da6d1941dfdae573b615a37cd02ad`, with the accepted M7 base `0bb1b2f3f6d4abe2d4c6d28cc36e864f73f46bd2` and the final reviewed PR49 source parent `480cc55f54e90f2dd9083ded107b389d3dc3a412`. The [PR49 natural run](https://github.com/fettpl/rustcrushcourse/actions/runs/37845814389) and exact [ordinary main run](https://github.com/fettpl/rustcrushcourse/actions/runs/37850180035) completed attempt 1 with all eleven jobs successful.

Both natural records contain 103 unit files with 1106 passing unit tests, 2406 authored Rust cases on stable and 2406 on exact MSRV, 137 browser cases with zero retries and flaky cases, and offline page errors `[]`. The final reviewed source `480cc55f54e90f2dd9083ded107b389d3dc3a412` had no new Code or Security findings, and all three prior findings were resolved. The accepted local M8 release used production preview build `dVi8cjh2XS9DdA998jOQT` with HTTP 200. Its bounded audit records 2 moderate, 0 high, and 0 critical production findings; the full audit records 5 high and 2 moderate findings, so these results do not establish a security-clean claim.

The `480cc...` identity is the prior PR49 final reviewed source, not a packet-005 source identity. Packet 003 and packet 004 authored materials are available in M8, while learner artifacts and results remain not observed. Packet 005 session stops and maintainer materials are an authored candidate in the current checkout. When material is used, record the actual checkout commit or authored-material hash; source existence remains separate from natural CI/main results, local release identity, and learner outcomes. No participant, timing, transfer, retention, efficacy, mastery, accessibility, deployment, or production-readiness claim follows from this snapshot.

# Verification records

Current shared-borrow and curriculum review: [Curriculum review — 8 October 2026](curriculum-review-2026-10-08.md). The dated snapshots below retain their original source cuts, counts, and evidence boundaries.

<a id="current-task5-local-snapshot-8-october-2026"></a>

## Current local Task 5 snapshot — 8 October 2026

This dated snapshot records the local function-ownership source candidate and its bounded verification evidence. The tested Task 4 runtime source is `99be9c11c2daaad068a0168267af62fd59722f7e`, tree `7d6892038f54514e1d62d56a88c3b063644933b1`, with accepted normal-main M2/PR43 base `e65fcf92a5794f9d3099b32b9665fe762223a7ba`, tree `6c232bce60c06e44dbbb90c38ac58dfcabe2e880`. The later test-only durability guard is candidate commit `802dd7ccbd2f8a10d7f7de0e2c9c7d0885d77f6d`, tree `aa2705c2eafd013774146c3337dfbfb3f7c8a850`; the documentation publication commit containing this section is a separate docs-only identity.

The source-derived inventory is 188 lessons, 48 modules, 191 concepts, 191 ordinary review entries, one separate delayed review entry, 192 combined review IDs and 7 traces. The current source retains the global `minimumCodingTasks: 2` policy. The function unit adds two fresh primary coding families and one separate delayed family; the existing `mutable-borrow` family remains outside this unit. The six other ownership concepts (`stack-heap`, `scope-drop`, `move-semantics`, `copy-semantics`, `shared-borrow`, and `ownership-repair`) remain provisional.

The Node 22.23.3 stable local pass used the Homebrew Node 22 executable and passed lint, typecheck, the full Vitest suite (96 files, 895 tests), content validation (188/191/7), the full authored Rust verifier (2,372/2,372), and the production build. The separate exact Rust 1.85.0 run passed the three affected suites (112 tests) and the full authored verifier (2,372/2,372). The maintained whole production browser phase passed 114/114 with workers 1, retries 0, flaky 0, skipped 0 and no test errors on the Task 4 runtime source; its preserved earlier run exposed one pre-existing note-after-reload assertion, and the focused amended test then passed 2/2 after requiring the exact note to be durable before reload. The owned offline verifier passed against `OFFLINE_BASE_URL=http://127.0.0.1:3019` with page errors `[]`. Real authored Rust compiler evidence and intercepted browser/UI evidence are separate scopes.

The initial 114-case browser run (113 passed, 1 failed, original exit 1) and the first whole rerun's inherited offline-target mistake are preserved in the ignored Task 5 report. In that rerun the browser phase was green, but the original process had `OFFLINE_BASE_URL` unset and the offline script therefore defaulted to forbidden port 3002; the interrupted command exited 130. The corrected owned 3019 run is the offline target evidence. No learner pilot, efficacy, general proficiency, WCAG/manual assistive-technology, security-clean, hosting, deployment, or professional/readiness claim follows. The accepted PR43 natural PR/main eleven-job evidence remains historical release proof; current new PR/main gates remain pending.

<a id="current-verified-source-cut-7-october-2026"></a>

## Current verified source cut — 7 October 2026

This snapshot records the product source cut normally merged by PR40 on 7 October 2026: main `230be35b918178f893341061e54650a7ac7bf8f1`, tree `842262a0afacdfa3551e2ca2124e2cda9d7121d6`, reviewed candidate `d2b9e10826f2a1d3584f0c95b2b2557ecfee1627`. Its ordered parents are `d2389c525cb79e7779c89c10b978ca788e713f18` and the reviewed candidate. Link [PR40](https://github.com/fettpl/rustcrushcourse/pull/40), [merged source](https://github.com/fettpl/rustcrushcourse/commit/230be35b918178f893341061e54650a7ac7bf8f1) and [reviewed candidate](https://github.com/fettpl/rustcrushcourse/commit/d2b9e10826f2a1d3584f0c95b2b2557ecfee1627). It records PR40 product evidence, not future acceptance of documentation changes.

Natural pull-request run [37609680264](https://github.com/fettpl/rustcrushcourse/actions/runs/37609680264) and natural push-main run [37613268933](https://github.com/fettpl/rustcrushcourse/actions/runs/37613268933), attempt 1, each completed all eleven required jobs successfully. Exact checkout identities, logs, artifacts and dependency-audit reports were independently reviewed; no failed, cancelled, timed-out, skipped, neutral or active job remained. A conditional failure-only diagnostics artifact step being skipped is distinct from a skipped required job.

Current source catalog: 186 lessons, 48 modules, 190 concepts, 141 **constrained empty-editor tasks with prescribed test APIs**, 332 sources, 13 downloadable Cargo projects, 7 traces; 194 competencies, 1,199 lesson steps, 444 lesson test evaluators, 190 review entries. These totals describe implemented content, not skill or efficacy.

### Accepted evidence by scope

| Scope                                        | Accepted result                                                                                                                                                         | Boundary                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Main unit checks                             | 93 files, 816/816 tests.                                                                                                                                                | Unit coverage is evidence for the checked repository.                                  |
| Full authored Rust CI                        | 2,350/2,350 on actual rustc 1.99.0; full MSRV 2,350/2,350 on exact Rust 1.85.0.                                                                                         | These are maintained authored fixtures, not arbitrary learner programs.                |
| Production browser                           | 90/90, zero retries/flaky/skipped; mocked runner cases establish request/UI/state behavior. Separate unmocked maintained-example browser/API smoke checks exact stdout. | The smoke path is not proof about arbitrary learner code.                              |
| Offline                                      | Page errors []; only expected disconnected transport errors.                                                                                                            | Rust execution requires connectivity and offline failure awards no assessment.         |
| Types/content/build/lint/native/audit        | Completed in the accepted full pipeline; lint 0 errors/26 inherited warnings.                                                                                           | The native probe is bounded environment evidence, not whole-product safety.            |
| Local pre-merge evidence, separately labeled | Full authored Rust 2,350/2,350 on explicit stable 1.98.1; affected focused checks 82 tests/79 real Rust fixtures per toolchain, on 1.98.1 and exact 1.85.0.             | Local focused MSRV is a different scope from the local full run and from full CI MSRV. |
| Dependency audit                             | Production 2 moderate/0 high/0 critical; full 2 moderate/5 high/0 critical. Production gate exit 0 and informational full audit exit 1 are expected distinct results.   | Findings remain unresolved; a high/critical gate pass is not security-clean.           |

### Implemented and deferred review map

PR38 merged Core17 plus 31 discovery entries with no reorder. PR39 merged exact ownership evidence; only `mutable-borrow` has the complete two-primary path. PR40 merged two conversion lessons, six primary executable tasks, three independent reviews, and the Option negative-input regression. Matching, Option, Result, borrowed access, iterator, and compiler-led debugging already have substantive practice.

Still open are the deeper ordinary-fluency audit, nested patterns, other ownership calibration, unrestricted portfolio decomposition/rationale/unseen follow-up, beginner timing and delayed-transfer pilot, full screen-reader/editor/small-screen audit, live advisory/license and production release requirements. Provisional estimates and fixed authored tests cannot close these gaps. Green CI and content counts do not establish mastery, efficacy, professional or senior readiness, general unsafe soundness, or unrestricted architecture skill.

## Historical verification records — superseded for current status by the snapshot above

The records below retain their dated source cuts, old failures, pending and Hold decisions, environment limitations, and historical uses of “current.” Product acceptance of PR40 is distinct from still-open release, publication, security, accessibility, and readiness prerequisites. Historical browser mocks, local compiler runs, and interrupted or infrastructure-limited jobs must not be read as evidence that their original environment later succeeded.

Date: 2026-10-06. Historical catalog snapshot: 184 lessons in 48 modules, 187 concepts, 139 blank-page tasks, 329 sources and 13 Cargo projects. The API Release Matrix adds two Polish lessons, four gates, two blank-page tasks and two retrievals; the fuzz evidence lifecycle adds four Polish lessons, eight gates, four blank tasks and four independent reviews; Macros as APIs adds three Polish lessons, three gates, three blank tasks and three retrievals. Browser checks use the existing mocked runner contract; Cargo, SQLite and TCP are exercised only by trusted authored archive verifiers. The Mini grep verifier accepts only the generated authored archive and records stable replay separately from the pinned-nightly campaign. The counts and claims below belong to that dated source cut.

### Historical fuzz evidence lifecycle

The latest review hardening is committed as `38fbdb061336a222b6db077630b1fd4c0943ca74` (`Exercise progressive fuzz reveal hints`). A `passed` dossier now requires trusted current run/archive/manifest/regression provenance, a nonzero bounded reduction with a strict smaller artifact, a reproducing mutant replay and a successful restored replay. The stable mutant control must show a successful compilation followed by the named regression failure; compiler, timeout and infrastructure errors are rejected. Public fixture contracts expose `same_result`, `executable_regression`, and the bounded `decode_frame` header/body contract used by the oracle blank; its prompt states the owned lossy query, borrowed raw body, big-endian header, `context = bytes[0] % 20`, clamp and 4096-byte rejection semantics; vectors reject 64-byte limits, missing clamps, strict UTF-8 and unnormalized context. Retrieval fixtures reject length-only, field-loss, matched-flag and order-normalizing mutants. The offline verifier now exercises prediction, a mocked primary run, reveal/download, assisted primary completion, independent mastery invariance, blank work, draft/note persistence and keyboard focus; local execution remains subject to the documented browser limits.

Commit `2fc588ef04a214dbdb8c4ea95b38455a3c3437f7` binds `stableRegression.sha256` to the separately checked-in `substring-prefix.seed` bytes and identity, while the padded witness remains the reduction artifact. The validator now rejects arbitrary target or mutant identities and trusted stable hash mismatches. The stable negative control requires the named `substring_prefix_witness_is_exact_and_replays_selection_mismatch` failure, so an unrelated boundary test failure cannot satisfy it.

The reviewed implementation is covered by commits `a73aa37d7d8da7c3152343c54db1c08d3fcf8f9f`, `688deab8a1a877511061fa67e98fdde9f9b0db7b` and the re-review hardening commit `7255efcd4498a5906bd2d6231db0b4f5ebcb6050` and manifest correction `9aaf06ca19d18e2aed86f0c7c03766836e40fd3e`. `npm run content:check` reports 181 lessons, 184 concepts and 7 traces; focused Vitest, TypeScript and build checks pass after the hardening changes. The package adds `fuzz/support/case.rs`, `fuzz/support/check.rs`, `tests/fuzz_regressions.rs`, `FUZZ-MANIFEST.json`, `FUZZ-EVIDENCE.md`, the exact seed `00 00 01 78 61 78 0a` (`9a4e5eea45a79d6a59b9c9e64d3e043ad612e9340526492e52f020526c4deaa1`) and the authored padded witness `00 00 01 78 70 61 64 64 69 6e 67 0a 61 78 0a` (`7427a9cf7670ef91d6a1a595178f366d4eff1e64ed0fa38e85f77dcb978708a2`). Stable/MSRV runs execute the checked-in regression; instrumentation and bounded campaign evidence use nightly-2026-08-08 with cargo-fuzz 0.13.2. Reports contain run ID, archive/manifest hashes, host, limits, raw logs, corpus, original/reduced artifacts, replay phases and limitations. The validator hashes actual files referenced by the current report, checks run, archive and manifest identity, enforces exact toolchains and phase status/failure kinds, and rejects stale or contradictory dossiers; a matching string alone is not accepted.

The campaign is capped at seed 20260913, 20,000 runs or 30 seconds, input length 3..=4096, timeout 3 seconds and RSS limit 1024 MB. The deterministic deletion reducer is capped at 256 attempts and a 30-second total deadline and accepts only strict reductions retaining `SelectionMismatch`; timeout, compile error or another assertion is rejected. A replay-only report, stale hash, missing instrumentation, timeout, or merely successful build is not campaign evidence. This milestone does not claim discovery of an unknown bug, universal input coverage, absence of bugs, production readiness, live advisory/license review, registry publication, or a learner pilot. Release remains Hold.

### Historical Macros as API evidence

The integrated `macros-as-api` module contains three Polish lessons: exactly-once expression capture and order, repetition grammar for empty/single/many entries with one optional trailing comma, and exported macro resolution through `$crate` plus the Rust 2024 `expr` fragment. Each lesson has a primary code gate, an independent blank-page gate and delayed retrieval. Browser exercises run one Rust source file and therefore prove only the browser model. The external fixture uses side-effectful `:expr` name and value arguments and proves their single evaluation in input order; it separately proves the external crate boundary and compiler-floor behavior.

The trusted fixture at `scripts/fixtures/macro-contracts` is a std-only two-crate workspace. Its stable and exact Rust 1.85.0 runs use offline locked Cargo commands, record fixture hashes and toolchain identity, and reject four controlled mutants: an unqualified library path, duplicate evaluation, strict repetition grammar, and `expr_2021` for top-level `const { ... }`. Missing toolchains and timeouts remain infrastructure failures; local verifier evidence does not replace exact-head CI.

### Historical verification record

The preceding fuzz-only validation report recorded passing focused fuzz assessment/verification/integration tests (13 tests), full Vitest (496/496), `npm run typecheck`, `npm run lint` (seven pre-existing warnings, zero errors), `npm run build`, `npm run content:check`, and the exact authored nightly rustfmt check for all five Mini grep fuzz/regression sources. Those results belong to that earlier tree. Historical PR21 evidence at `7e3755d76e3f283384ed1a1edc394934c2aeb2a9` recorded the exact-lock build/offline flow, full Vitest (80 files, 519 tests) and `content:rust` (2,179/2,179); its exact-head full eight-job CI run `37466704677` passed and it was merged to `main` as `5f24e16`. The post-merge main run `37470629408` also passed all eight jobs. PR25’s exact e1 head `e1d595ea02fb7d798a6ee6d2ccf1023f74e71503` then passed full eleven-job CI run `37472355611` and was merged to `main` as `ba15a44b7674a030e30e40f81fdb8c681e845256`. As observed at 2026-10-06 14:08:12Z, post-merge main run `37475705431` remained `IN_PROGRESS`: its `verify` job had terminally failed only because the default 5-second Vitest timeout expired in `api-release-matrix-integration.test.ts:191`, with 82 files and 538 passing tests and no semantic assertion failure, while `workspace-msrv` remained active in `content:performance`. No whole-pipeline terminal status is claimed. The bounded harness repair remains under investigation; no concrete commit or QA status is claimed here. The combined local candidate at `467f857374ff048dd08cb7c1ed82172af665ecc0` has 87 test files and 558 passing Vitest tests, `npm run content:rust` 2,312/2,312 authored cases, the derived 184/187/7 catalog counts, `npm run typecheck`, and ESLint with 0 errors and 26 warnings inherited from the approved PR27, PR21, and PR25 parents. A clean lock-matched Node 22 `npm ci` used Next.js 16.3.5; macro stable/MSRV, API stable, borrowed-memory stable (236/236), content validation, package generation and the Webpack production build passed. Browser evidence remains targeted or mocked; no full local production browser E2E result is claimed. The Rust verifiers are compiler-backed authored-fixture evidence, while browser mocks do not prove Rust semantics. This local evidence does not replace pending exact-head CI checks. The Mini grep verifier reduces and replays the authored padded witness through the actual SelectionMismatch mutant, treats compile failures as infrastructure observations, bounds reducer subprocesses, and exits nonzero for phase, lockfile or report-validation errors. The CI job installs nightly-2026-08-08, exact Rust 1.85.0 and cargo-fuzz 0.13.2. Earlier sandbox-limited reports recorded loopback and Chromium permission failures; those remain historical. Local nightly campaign evidence remains unclaimed without cargo-fuzz. Release remains Hold pending the required CI and broader evidence.

### Historical runtime allocation evidence

### Historical API Release Matrix evidence

The `api-release-matrix` module teaches two bounded decisions: classify an old-client observation before calling it a public API break, behavior regression, or infrastructure/missing evidence; then require provenance-bearing records for the old client, default/no-default/opt-in features, and exact Rust 1.85.0. Each lesson has a primary gate, an independent blank-page gate, and a delayed retrieval. Browser evaluators model these decisions in single-source Rust and do not claim Cargo manifest, resolver, external-crate, or compiler-floor evidence.

The trusted `content:api-release` verifier accepts only its authored std-only fixture. It runs the separate `old_consumer` crate on stable and exact Rust 1.85.0, records toolchain/configuration/client/outcome/hash provenance, and rejects controlled compile and behavior mutants. Local focused evidence includes verifier tests and stable/MSRV runs; these checks remain separate from GitHub Actions and do not constitute a public release approval.

`content:allocations` regenerates and byte-compares the authored Log Analyzer starter and solution archives, validates `ALLOCATION-MANIFEST.json` and source hashes, then runs formatting, locked/offline Cargo checks, tests and Clippy. Its single-process probe runs baseline, candidate and a materialization mutant in separate processes over eight identical workloads, including a controlled reader error and exact 4096/4097 line boundaries. The counter records `alloc`, `alloc_zeroed`, `dealloc` and successful `realloc` events plus requested and freed bytes; setup, warm-up, formatting and teardown stay outside the measurement window. Reports include archive SHA-256, toolchain, target, workload and explicit limits. They do not claim RSS, retained memory for the whole process, a platform-independent threshold or a universal performance result.

### Historical capstone integration status

Task 6 covers the learner path searched as `trwaly serwis`, a mocked gate attempt, exact lesson/draft/note resume, project selection and both ZIP downloads. The offline harness preserves all prior package checks, adds the existing Miri package to the twelve-package set, caches both capstone variants, compares their bytes after an offline reload, and resumes a capstone draft and note.

The capstone verifier has bounded subprocess commands and writes one JSON report per toolchain. A release is not reported as a full archive pass unless both stable and Rust 1.85.0 runs finish and their JSON evidence is reviewed. Full property/fuzz scope, live advisory refresh, registry publication, production operations and the learner pilot remain open.

### Historical preceding-stage details

### Historical Dependency Assurance

Etap `dependency-assurance` ma cztery polskie lekcje, osiem evidence gates, cztery zadania blank-page i cztery kodowe retrievals. Pure-Rust contracts są deterministyczne: diagnozują duplicate package/version/source, egzekwują registry plus MIT/Apache-2.0, oceniają advisory exception przez wstrzyknięte `as_of_ymd` oraz zatrzymują release przy pustym artefakcie, braku external consumera lub `publish = true`.

`content:supply-chain -- --fetch` regeneruje autorski ZIP, rozpakowuje wyłącznie solution, sprawdza `deny.toml`, policy, exception ledger, duplicate evidence, pinned `cargo-deny` snapshot i release evidence manifest (w tym SHA-256 rzeczywistych `Cargo.toml`/`Cargo.lock`), a następnie wykonuje offline/locked `cargo metadata`, `cargo tree`, workspace check i `fixtures/external-consumer` po wygenerowaniu jego lockfile. Weryfikator odrzuca argumenty poza `--fetch`/`--msrv`, nie przyjmuje ścieżek ani kodu ucznia i nie uruchamia sieciowego cargo-deny. Snapshot ma `execution_status = unsupported/infrastructure`, więc decyzja pozostaje `hold-until-local-verifier`; ten etap nie twierdzi, że ma aktualną bazę advisory, kompletny SBOM, ocenę prawną ani publikację crate.

### Historical preceding-stage controls

| Sprawdzenie                   | Wynik                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                        | Historical preceding-stage result: 382 tests in 65 files after the Dependency Assurance integration; the current Task 6 focused checks are recorded below.                                                                                                                                                                                  |
| Stable i dokładny Rust 1.85.0 | Historical Service Operations result: `content:operations -- --msrv` regenerated and compared both ZIPs, then passed fmt, locked/offline check, tests, Clippy and six controlled mutants on exact 1.85.0.                                                                                                                                   |
| TypeScript i ESLint           | Brak błędów; dwa wcześniejsze ostrzeżenia w borrowed-hrtb.ts                                                                                                                                                                                                                                                                                |
| Curriculum i źródła           | Historical preceding-stage snapshot: 169 lessons, 172 concepts, 7 traces and 314 sources; its then-current catalog row recorded 171 lessons, 174 concepts, 7 traces and 314 sources. The current integrated catalog is recorded at the top of this document.                                                                                |
| Autorskie przypadki Rust      | Service Operations ma 20 stałych pure-Rust evaluator cases (16 lesson gates/recall i 4 review), a FFI package verifier pozostaje osobnym native Cargo check; focused content tests przechodzą                                                                                                                                               |
| Niezależne recenzje           | Implementacja Luna high; wcześniejsze milestone reviews Astra medium: APPROVED. Bieżący review granicy profilu i kontrolowanego mutanta jest osobnym follow-upem.                                                                                                                                                                           |
| Build                         | Pass                                                                                                                                                                                                                                                                                                                                        |
| Offline                       | Historical cache v27 result; the current Task 6 offline run must include all twelve prior packages, Miri Safety, both capstone ZIPs byte-for-byte, and capstone draft/note resume.                                                                                                                                                          |
| Performance Evidence Cargo    | Pass na stable i exact Rust 1.85.0: przypięty Criterion 0.5.1, formatowanie, testy kontraktu wyniku, benchmark offline/locked i uruchomienie bez uniwersalnego progu czasowego                                                                                                                                                              |
| Profile Evidence Cargo        | `content:profiles` sprawdza 20-file Log Analyzer archive, manifest, source-model contract, controlled mutant, fmt, locked/offline targets and tests; `content:allocations` osobno weryfikuje authored runtime probe; `--msrv` uses exact Rust 1.85.0                                                                                        |
| External profile evidence     | Dedicated CI job runs fresh Valgrind Callgrind and DHAT modes on Linux, refuses stale fixtures, and uploads the two reports for seven days                                                                                                                                                                                                  |
| Miri Safety Cargo/Miri        | `content:miri -- --stable --fetch` and `--msrv --fetch` select explicit safe-package compilers, validate the authored archive and controlled mutant, compile three negative fixtures to metadata, then invoke only pinned `nightly-2026-08-08` Miri. Each UB result must contain its own fixture filename and category-specific diagnostic. |
| Dependency Assurance          | `content:supply-chain -- --fetch` passes archive freshness, authored policy/ledger structure checks, pinned offline cargo-deny snapshot checks, locked/offline workspace Cargo checks, and an extracted external consumer; `publish = false` is required while cargo-deny remains unsupported/infrastructure.                               |
| Ręczny UI                     | Mapa → kryterium → Monaco; czytelny prompt i starter. Klawiaturowe otwarcie blanku prowadzi do pustego edytora; brak błędów konsoli                                                                                                                                                                                                         |

### Historical evidence scope

Stały harness obejmuje dokładnie 14 nowych kontraktów fixture: osiem zadań gate/blank (cztery główne bramki i cztery blanki), dwa dodatkowe recall w lekcjach kontrprzykładów oraz cztery niezależne review. Każde rozwiązanie referencyjne, poprawny wariant i mutant kompilują się osobno przez Rust 2024. Poprawne odpowiedzi muszą wykonać niepusty zestaw testów. Mutant musi się skompilować, a następnie zakończyć statusem 101 z rzeczywistą nieudaną asercją. Timeout, sygnał procesu i błąd kompilacji nie zastępują dowodu. Produkcyjny evaluator otrzymuje faktyczny raport Rust.

Property Contracts dodaje osobny, zaufany pakiet Cargo z biblioteką std-only i Proptest 1.11.0 jako dev-dependency. Weryfikator nie przyjmuje kodu ani ścieżek z zewnątrz: buduje wyłącznie autorskie archiwum, sprawdza lockfile, przechodzi rozwiązanie i replay `property_contracts.txt`, odrzuca starter z `todo!` oraz uruchamia dwa kontrolowane mutanty: ignorujący malformed przy aktywnym filtrze i zachowujący białe znaki parsera. Stable i exact Rust 1.85.0 są obsługiwane przez osobne tryby polecenia. Własności obejmują zadeklarowaną domenę generatora; nie są dowodem wszystkich danych, pełnego fuzzingu ani gotowości produkcyjnej.

Performance Evidence dodaje cztery lekcje, osiem bramek, cztery blanki i cztery powtórki. Stałe fixture obejmują 16 zadań lekcji i cztery review; poprawne warianty i mutanty kompilują się osobno przez Rust 2024, a wynik zależy od asercji i raportu testów. Żaden evaluator nie używa `Instant`, `SystemTime`, `elapsed` ani `sleep`, więc zegar ścienny nie jest kryterium zaliczenia.

Log Analyzer ma dev-only Criterion 0.5.1 oraz `tests/performance_contract.rs`, który porównuje kształt wyniku ścieżki bazowej i pożyczanej ścieżki dla małych, mieszanych i kończących się bez LF danych. `content:performance -- --fetch` pobiera przypięty lockfile, a potem sprawdza `fmt`, `check --all-targets`, kontrakt i uruchomienie benchmarku offline/locked. Benchmark zapewnia wykonywalny punkt porównania dla jednego workloadu; milestone nie ustanawia progu czasu, profilu CPU/heap, licznika alokacji ani uniwersalnej tezy o szybkości.

Profile Evidence adds four lessons, eight gates, four blank-page tasks and four coding retrievals. The authored Log Analyzer package now contains `tests/source_model_contract.rs`, `PROFILE-MANIFEST.json`, `PERFORMANCE.md`, `ALLOCATION-MANIFEST.json` and the allocation counter/probe in a 20-file archive. The fixed contract generates 512 INFO records before the parser call and checks source-level assumptions against the API and constants; `content:allocations` separately verifies runtime calls using strict result reports. `content:profiles` regenerates and compares both served archives, validates the manifest, runs formatting, locked/offline all-target checks, the authored source-model contract, and a controlled mutant that replaces the parser buffer capacity with the setup value. The verifier requires the mutant to terminate normally with the named Rust test failure; compiler errors, signals and tool failures are not accepted. It never accepts checked-in profile output as evidence.

`content:profiles -- --profile=callgrind` and `--profile=dhat` require the installed Valgrind executable, run the authored source-model test binary, and require exactly one fresh non-empty report. The dedicated CI job installs Valgrind when needed, runs both modes on the Linux runner, and uploads the reports as seven-day artifacts. The external report covers the whole Rust test process, including the harness, workload construction, parser call, assertions and teardown; it cannot attribute samples exclusively to `analyze_reader`. The baseline/candidate contract checks summary equality only, so it does not compare profiler samples or allocation counts. The separate runtime probe is bounded to its named process and workloads and does not claim a platform-independent timing threshold or universal speed result.

Unsafe/FFI ma cztery lekcje, osiem bramek, cztery blanki i cztery niezależne powtórki. Pure-Rust authored fixtures sprawdzają politykę null/zero, granicę `split_at_mut`, walidację tagu i zarezerwowanych flag oraz pojedynczy release w RAII. Dziesiąty pakiet `ffi-buffer-workshop` zawiera checked-in C header/source, `build.rs`, opaque ABI declarations, checked Rust wrapper, native integration tests and `SAFETY.md`. `content:ffi` regeneruje i porównuje starter/solution ZIP, rozpakowuje wyłącznie authored solution, uruchamia `cargo fmt`, `cargo check --all-targets --offline --locked`, `cargo test --offline --locked` i Clippy. CI odpala verifier osobno przed generycznym `content:cargo` w stable i MSRV jobs. Nie uruchamiamy Miri na tym pakiecie: kompilowany C i allocator są częścią kontraktu fixture. Wspierany pure-Rust harness Miri znajduje się teraz w pakiecie `miri-safety-workshop` i obejmuje ograniczony zestaw fixture’ów ByteView/Slot/MutSlot; nie wykonuje się kodu ucznia/importu ani zewnętrznego Playground.

Service Operations ma cztery lekcje, osiem bramek, cztery blanki i cztery niezależne powtórki. Pure-Rust fixtures sprawdzają kolejność trust/proof/limit, allowlistę źródeł i correlation ID bez payloadu, readiness przed drain, dokładnie jeden terminal event oraz rozdzielenie timeoutu od completion. Jedenasty pakiet `service-operations-workshop` zawiera przypięte Tokio 1.53.1, `src/operations.rs`, contract tests, controlled mutants, `THREAT_MODEL.md` i `RUNBOOK.md`. `content:operations` ma pre-hook regenerujący oba ZIP-y i odrzuca stalenie przez porównanie bajtów; stable oraz exact Rust 1.85.0 uruchamiają `fmt`, locked/offline `check`, testy, Clippy i sześć kontrolowanych mutantów przed generycznym `content:cargo`. E2E i offline sprawdzają nawigację, dokładne wznowienie, pobranie startera i cache. Fixture nie jest produkcyjnym backendem telemetrycznym, nie uwierzytelnia źródeł poza przykładową allowlistą i nie twierdzi, że można bezpiecznie przerwać arbitralną pracę blocking.

Miri Safety ma cztery lekcje, osiem bramek, cztery blanki i cztery niezależne powtórki. Pure-Rust fixtures uczą kontraktu `ByteView`, granic rozłącznego podziału, stanu `Slot<T>` z `MaybeUninit` i krótkiego reborrow `MutSlot`, a projekt `miri-safety-workshop` dodaje trzy osobne programy UB: out-of-bounds, use-after-free i aliasing. `content:miri` akceptuje wyłącznie autorskie archiwum i dwa jawne tryby safe-package compiler (`--stable` lub `--msrv`); oba sprawdzają stable/MSRV Cargo, po czym używają przypiętego nightly tylko przez Miri. Negatywne fixture'y kompilują się do metadata i nie są uruchamiane natywnie. Matcher wymaga nazwy właściwego pliku oraz diagnostyki właściwej dla danego przypadku, więc ogólny błąd Miri nie zastępuje dowodu.

Historyczny zestaw GAT obejmował producentów z testami kolejności, pustych elementów, tożsamości danych, lokalnych typów bez Copy/Clone, granic szerokości, dodatniego limitu prefiksów, nakładania i zachowania mutacji. Obserwatory Drop potwierdzały zatrzymanie zajętych wartości aż do zniszczenia właściciela. Regresje odrzucały błędną arytmetykę konstruktora, odwrócenie wnętrza wierszy, ignorowanie limitu, bufor pomocniczy i przedwczesne niszczenie.

Historyczny zestaw GAT obejmował też konsumentów z klientami ze slice oraz własnymi opakowaniami AsRef/AsMut, lokalnymi rekordami i nieklonowalnymi raportami pożyczającymi osobny kontekst callbacku. Testy sprawdzały kolejność zaakceptowanych raportów i kontynuację po odrzuconym raporcie. Adaptery miały sprawdzaną leniwą konstrukcję, dokładne odpytywanie, częściowe zużycie, puste elementy, odczyty posiadanych raportów po zakończeniu pożyczek i terminalność dla źródła None → Some. Zadanie od pustej kartki nie wymagało niezadeklarowanych derive; prywatny układ adaptera pozostawał dowolny.

Historyczna weryfikacja GAT sprawdzała arytmetykę nasycającą ordinali przez przegląd kodu; testy nie osiągały usize::MAX odpytań. Próby szerokości usize::MAX dotyczyły innej, rzeczywiście wykonanej granicy. Obserwacje kompilatora pokazywały E0499, ograniczenie konkretnej projekcji HRTB (E0597) i niezgodność pokazanego GAT API z dyn (E0038), wraz z poprawnymi kontrastami. Nie wynikało z tego, że każdy HRTB wymaga static lub że zwykły iterator nie może zwracać zewnętrznie pożyczonych slice.

The integration checks four criteria: reveal does not grant independence, blanks remain fresh, export/import preserves evidence, and the earlier draft and note resume. Implementation and tests used GPT-5.6-Luna high; earlier milestone reviews used GPT-6-Astra medium and their APPROVED status is historical. The current follow-up covers the profile boundary and mutant validation. E2E supplies mocked runner responses and does not prove Rust semantics. Only fixed authored sources run locally, never learner drafts or imported code. No new POST was sent to the public Playground.

### Historical environment disruption

Pierwszy E2E zatrzymał się w istniejącej kontroli Axe scenariusza Tokio. Ślad obejmuje przerwę 17:52:14–18:07:12, a dziennik zasilania potwierdza uśpienie 17:52:12–18:07:13 (901 sekund). Dwa przypadki Rust zgłosiły ETIMEDOUT. Nie zmieniano implementacji, limitów ani retry. Dotknięte kontrole przeszły bez zmian; pełne powtórzenie używa tymczasowego caffeinate -i na macOS.

### Historical CI and release

Etap GAT jest zapisany w commicie `4c7e499` i PR #10, scalonym jako `054a12de`. Lokalna weryfikacja i trzy zadania CI przeszły dla dokładnego head `2b6500e`, a post-merge workflow `35248633175` przeszedł dla `main@054a12de`. Stable uruchamia pełny zestaw, workspace-msrv dodatkowo trzy zestawy GAT na dokładnym Rust 1.85.0, a mini-grep-fuzz zachowuje zakres. Krok MSRV dodaje do PATH rzeczywisty katalog z rustup which: samo rustup run może nadal wybrać systemowy kompilator. Property Contracts ma osobny krok `content:property` w stable oraz workspace-msrv, z dokładnie tym samym ograniczeniem do autorskiego pakietu. Service Operations ma osobny krok `content:operations -- --fetch` w obu jobach przed generycznym `content:cargo`; MSRV używa dokładnego Rust 1.85.0.

Cargo scalono w [PR #9](https://github.com/fettpl/rustcrushcourse/pull/9) jako 2a68786. Trzy zadania przeszły dla [head 520ed98](https://github.com/fettpl/rustcrushcourse/actions/runs/35234913384) i [main](https://github.com/fettpl/rustcrushcourse/actions/runs/35235866279). GAT scalono następnie w [PR #10](https://github.com/fettpl/rustcrushcourse/pull/10) jako `054a12de` z tested head `2b6500e`; po scaleniu uruchomiono osobny workflow `35248633175` na `main`. Drzewo scalenia było identyczne z testowanym head. Historyczny raport w wersji 2a68786 tego pliku opisuje Cargo, 216 testów Vitest, 1397 przypadków Rust, 50 E2E i offline v24.

Performance Evidence jest zintegrowane z `main` w commitcie `b8043d2`; wcześniejsze prace obejmują commity `a2473d4`, `1fef3c2`, `c969662` i `d092232`. Stable i workspace-msrv pobierają Criterion przed generycznym `content:cargo`; job MSRV dodaje do PATH katalog narzędzi z `rustup which`, a następnie uruchamia Performance Evidence fixtures na dokładnym Rust 1.85.0. Ten przebieg nie zmienia schematu postępu v3 ani nie udaje numerycznego progu benchmarku.

Pożyczone API i angielskie README scalono w [PR #8](https://github.com/fettpl/rustcrushcourse/pull/8) jako 57c24f9, po sukcesie [CI head](https://github.com/fettpl/rustcrushcourse/actions/runs/34750981784) i [CI main](https://github.com/fettpl/rustcrushcourse/actions/runs/34832213874). Number Guessing+ scalono w [PR #7](https://github.com/fettpl/rustcrushcourse/pull/7), Mini grep w [PR #2](https://github.com/fettpl/rustcrushcourse/pull/2), wcześniejszy etap w [PR #1](https://github.com/fettpl/rustcrushcourse/pull/1). Zasady i ograniczenia ochrony gałęzi opisuje [CI/CD](ci-cd.md). Hosting nadal nie został wybrany.

### Historical reproduction and remaining scope

Polecenia pełnej weryfikacji, instalacji narzędzi i projektów opisuje angielskie README, a dokładny zestaw MSRV znajduje się w .github/workflows/ci.yml. `npm run content:performance -- --fetch` trzeba wykonać przed offline `content:cargo`; wariant `--msrv` sprawdza ten sam pakiet przez exact Rust 1.85.0. E2E wymaga produkcyjnego serwera na 127.0.0.1:3002 i konfiguracji .github/playwright.production.config.ts z zerem retry. Offline uruchamia npm run test:offline, w tym wznowienie blanku Performance Evidence. Na macOS długi zestaw można poprzedzić caffeinate -i.

Remaining scope includes version conflicts, dependency security and publication, unsafe abstraction variance, full property/fuzz coverage, RSS/retained-memory attribution, system operations and capstone release evidence. The capstone has bounded learner integration, but release remains Hold until two fresh, reviewed stable/MSRV JSON reports and a manual advisory/license review are complete. Miri Safety provides a limited supported pure-Rust fixture set and does not replace a full threat model or prove that every unsafe program is defined. The limited Unsafe/FFI wrapper does not prove that foreign code is trustworthy. The Log Analyzer benchmark and allocation probe are executable evidence for named workloads; neither establishes a regression time threshold or universal speed claim. Migration history and material provenance need further work. A learner pilot and manual screen-reader review are still required. Lesson availability and green tests do not guarantee professional readiness.

<a id="local-workspace-candidate-7-october-2026"></a>

## Local workspace candidate verification — 7 October 2026

This dated section records a local verification candidate after the accepted
two-file integration repair. The tested product source is
`9b70b6487913abb7789ae6854f8390181786a3cd` with tree
`dcf7d952968ccc036434a787c918d5665e7f7ee8`, tested against accepted normal-main
base `c1f9146caaad758bcee3ed2e6ec3468750e9a04a`. The later docs-only
publication commit is a separate Git commit created from this append; it is not
the tested product source and is intentionally identified by Git after
publication. The accepted externally reviewed PR42/base evidence runs
`37653130324` and `37656388270` remain separate evidence states. No future PR or
resulting main acceptance is claimed here.

The fresh local run used Node 22.23.3 at
`/opt/homebrew/Cellar/node@22/22.23.3_1/bin/node`, a private production server
on `127.0.0.1:3317`, and a temporary Playwright config under the ignored
`test-results/a11y-task5-final-round2/` folder. Exact source HEAD/tree, base
ancestry, R..M UI zero-diff, clean status, Node identity, empty port, server
PID/cwd/parent/listener/readiness and listener-gone cleanup were recorded in
the raw wrapper output. The fresh Webpack production build exited 0.

The complete production browser run passed 106/106 tests with retries 0,
including the existing Axe checks. It exercises the four changed behavior
areas: the single polite atomic save-live sibling and clear-to-saved behavior;
mobile drawer inert boundaries with keyboard focus and Escape return; named
tabpanel relationships with all three desktop regions visible; and controlled
Rust/TOML fallback ownership, labels and focus. A separate authored
`scripts/smoke-cargo-io.ts` run passed 7 live API cases and 11 authored tests,
asserting status, raw stdout/stderr and live output. This is maintained authored
fixture evidence using the runner's temporary filesystem; it does not prove
arbitrary learner execution, a local Cargo package, or persistence between
requests. The offline verifier passed with page errors `[]`; its five expected
disconnected transport console messages remain classified as offline evidence.

Owned visual captures are preserved at
`test-results/a11y-task5-final-round2/visuals-rerun-final/`. The narrow light
capture records reduced-motion, an actual light `data-theme`, keyboard-open
drawer focus with a solid 3px focus outline, Escape focus return, and Code and
Output panel visibility. The desktop dark capture records an actual dark
`data-theme`, reduced-motion and three visible named panels. Rust and TOML
fallback captures record their labels and focused textareas. Clean paths had no
unexpected console, request or page errors. Monaco-block paths classify only
the correlated loader `net::ERR_FAILED`, its Monaco diagnostic messages and
page error `Event` as intentional. The invalid historical
`raw/mobile-menu-open-dom.txt` remains unsuccessful and is not cited as proof.

These automated checks cannot prove Escape announcements, live-region speech,
focus interpretation, or screen-reader output. No VoiceOver/NVDA evidence,
human efficacy or beginner-pilot evidence, WCAG conformance, or unrestricted
learner-code claim is made. The 6 October review limitations remain open,
including the broader screen-reader/editor/small-screen review and
manual advisory/license work. The inherited dependency audit is not
security-clean. PR40 and docs-only PR41 historical records above are preserved
byte-for-byte; this section is the current local candidate snapshot only.

<a id="whole-fix-1-focus-indication-7-october-2026"></a>

## Whole fix 1 focus indication verification — 7 October 2026

This dated addendum records the bounded `WS-A11Y-001` follow-up for the
focused controlled fallback textarea. The product source tested is commit
`f5b2cbd755a65469fdfc4217f262bdd88d7729f5` with tree
`3af718517d426c126582cb880874a787feec2b80`, based on accepted normal-main
commit `c1f9146caaad758bcee3ed2e6ec3468750e9a04a`. The later docs-only
publication commit is separate from this tested source commit and is recorded
by Git after this append. Earlier Task 5 broad `106/106`, runner, offline and
visual evidence remains historical evidence for the prior product candidate;
this addendum does not relabel it as a fresh whole-suite run for this CSS fix.

The source change adds `.code-textarea:focus-visible { outline-offset: -3px; }`
in `src/app/globals.css`, keeping the existing 3px solid accent outline inside
the `overflow: hidden` editor wrapper. Existing manual and automatic fallback
behavior, controlled Rust/TOML drafts, labels, read-only behavior and Monaco
loader classification remain unchanged. The focused e2e spec now checks the
computed outline style, width and inset offset plus the textarea and wrapper
rectangles in the narrow Rust and TOML flows; it retains the existing draft,
focus-transfer, outside-focus, 12-second and intentional-error checks.

The dirty RED evidence is preserved under
`test-results/a11y-whole-fix-1/`: the production fallback run exercised five
cases, passed two and failed the three new focused geometry assertions on the
unchanged CSS because computed `outlineOffset` was `5px` rather than `-3px`.
The raw wrapper ended with process exit `143` after the recorded server was
stopped separately; its focused test output, screenshots, trace artifacts,
dirty test diff and diff hash remain unchanged. This is development RED
evidence, not a clean committed acceptance run.

After the source/test commit, a fresh Webpack production build exited `0`.
The committed focused production fallback run passed `5/5` tests with retries
`0`: manual Rust, clean Monaco, automatic Rust focus transfer, outside-focus
preservation and automatic TOML draft/focus transfer. The run used Node
`v22.23.3` at `/opt/homebrew/Cellar/node@22/22.23.3_1/bin/node`, private port
`3317`, exact source/tree/base/design guards, server PID/cwd/parent/listener
checks and numeric cleanup (`kill 0`, expected wait `143`, listener-gone `0`).

A helper-only visual rerun against that unchanged fresh build passed with the
same identity guards and cleanup. It wrote separate PNG, HTML and JSON files
under `test-results/a11y-whole-fix-1/visuals-final/`. The narrow light Rust
and dark TOML focused captures each record actual `data-theme`, focused
`Kod Rust`/`Kod TOML`, a solid 3px outline with computed offset `-3px`, the
outline contained within the textarea, textarea and wrapper rectangles, and
wrapper `overflow: hidden`. Clean light/dark paths had no unexpected console,
request or page errors. Fallback paths classify only the correlated
`/monaco/vs/loader.js` `net::ERR_FAILED`, Monaco `Event` diagnostics and page
error `Event` as intentional; unexpected error arrays are empty.

No full unit, Rust, 106-test, API, offline or natural PR/main gate was repeated
for this two-file CSS/test fix. External latest-PR and normal-main jobs remain
separate pending release gates. Manual VoiceOver/NVDA speech, WCAG conformance,
human efficacy, security-clean status and broader screen-reader/editor review
remain unproven.
