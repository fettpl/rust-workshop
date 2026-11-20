# Task 6 report — final learner, offline, documentation and release audit

Status: bounded integration verified; archive release evidence remains Hold.

The current catalog is 164 lessons in 43 modules, 167 concepts, 119 blank-page
tasks, 7 memory traces, 308 sources and 13 Cargo projects. The capstone contains
six Polish lessons, 12 behavioral gates, six true blank tasks, six independent
coding reviews, three crates and exactly 35 authored workspace files. The
solution exposure set names all 12 primary gate refs. Starter documentation is
an exercise template and discloses none of those gate answers, so
`starterRevealStepRefs` is intentionally empty. The six blank and six review
refs remain independent and are not exposed by the solution package.

## Fresh bounded verification

Commands were run from `<maintainer-home>/Documents/GitHub/rustcrushcourse`.

| Command                                                                                                                                        | Result and bounded scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                                                                                 | PASS; 0 errors and 7 pre-existing unused-variable warnings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run typecheck`                                                                                                                            | PASS; `tsc --noEmit`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm test -- --run`                                                                                                                            | PASS; 69 files and 427 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run content:check`                                                                                                                        | PASS; `Content valid: 164 lessons, 167 concepts, 7 traces.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run content:audit`                                                                                                                        | PASS; 308 sources, no broken references, no lessons without evidence and no concepts without active review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run content:packages`                                                                                                                     | PASS; regenerated all package ZIPs. Capstone starter is 16,516 bytes and solution is 38,082 bytes after starter-document redaction and the Polish solution release limitation.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run build`                                                                                                                                | PASS; Next.js 16.3.5 production build, TypeScript and static generation completed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `npx --no-install vitest run src/content/projects/durable-log-service/package.test.ts src/content/capstone-verification.test.ts`               | PASS; 2 files and 12 tests after the starter-document audit. The focused earlier CI/content suite passed 5 files and 30 tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `perl -e '$SIG{ALRM}=sub{exit 124}; alarm 20; exec @ARGV' npx --no-install playwright test tests/e2e/capstone-integration.spec.ts --retries=0` | PASS; one focused browser test in 2.6 seconds (3.3 seconds total). The mocked `/api/run` response is recorded as a failed test attempt; the test does not execute learner Cargo. It verifies search `trwaly serwis`, gate attempt, exact draft/note resume, starter and solution ZIP downloads, persisted solution exposure for all 12 primary refs after reload, six registered review sessions checked through `reviewSessionKey(session.sessionId)` progress and review exposure records, false exposure for six blanks, and an empty blank editor. This is a focused capstone test, not the full production Playwright suite from CI. |
| `npm run test:offline`                                                                                                                         | PASS with the production server on loopback and network disabled during offline assertions. The harness preserved all 12 prior package checks, added Miri Safety to that set, resumed the capstone draft/note and exact gate, and compared both capstone ZIPs byte-for-byte after reload.                                                                                                                                                                                                                                                                                                                                                 |
| `rg -n -i '\\b(java\\                                                                                                                          | python)\\b' src/content src/components README.md docs --glob '!docs/superpowers/**'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | PASS; no Java or Python references in learner content or current documentation. |
| `git diff --check`                                                                                                                             | PASS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

The final bounded package regeneration covered the learner-facing Polish
`RELEASE.md` limitation. The tracked stable/MSRV JSON evidence remains explicitly
bound to revision `82e2406`; this documentation-only package change does not
retroactively claim a new archive verifier pass.

The bounded probes used
`perl -e '$SIG{ALRM}=sub{exit 124}; alarm 60; exec @ARGV' npm run content:rust`
and the same wrapper around `npm run content:cargo`. `content:rust` printed the
Rust version and produced no further output before the 60-second alarm. The
Cargo probe regenerated the package ZIPs and began the generic package checks,
but also hit the 60-second alarm before completion. These are bounded
infrastructure/runtime limitations, not local passes; generic archive coverage
continues to be represented by the unchanged CI step after the restricted
capstone verifier.

## Archive evidence and release limitation

Both restricted archive commands were run with a 180-second outer alarm and the
verifier's documented 120-second Cargo command limit. The reports bind the
served and generated solution archive to the same digest:
`4c470486adbf5d281965c52741fcc4266323416957ba4a85443fb79bd6ec96af`.

Stable command:

```text
perl -e '$SIG{ALRM}=sub{exit 124}; alarm 180; exec @ARGV' npm run content:capstone -- --fetch
```

The run returned `status: failed`; its reviewable JSON evidence is tracked at
`docs/evidence/capstone/stable-report.json`. The report was generated against
revision `82e2406`.
The stable toolchain was Homebrew Rust 1.98.1 / Cargo 1.98.1. The authored
starter and solution checks, formatting, Clippy, docs, doctests, feature checks,
external consumer and workload reached the verifier. The tracked report records
one mutant, `changed-payload-accepted-as-duplicate`: its required clean compile
command ended with `SIGTERM` and classification `signal`, so it is not accepted
mutant evidence. The verifier then ran the restored reference check
`cargo test -p ingest-store --test transactions --offline --locked changed_payload_is_a_conflict_without_modification`,
which passed. No later stable mutant results are recorded in this report.

MSRV command:

```text
perl -e '$SIG{ALRM}=sub{exit 124}; alarm 180; exec @ARGV' npm run content:capstone -- --fetch --msrv
```

The run returned `status: failed`; its reviewable JSON evidence is tracked at
`docs/evidence/capstone/msrv-report.json`. The report was generated against
revision `82e2406` and has
exact Rust 1.85.0 / Cargo 1.85.0 / rustdoc 1.85.0 paths. The authored archive
checks and earlier mutants reached the lifecycle suite, but
`frame-deadline-reset-per-read` ended with `SIGTERM` while its deliberately
reset deadline test was waiting. A signal is infrastructure/timeout evidence,
not a valid behavioral mutant rejection. The MSRV report also records the
earlier expected mutant failures and restored reference passes; neither report
is a full archive pass.

The release remains **Hold**. The verifier is intentionally honest: a public
release cannot claim a stable/MSRV archive pass until both runs finish with
fresh JSON reports whose command records and mutant evidence have been reviewed.
Live advisory/license review, runtime allocation measurement, full
property/fuzz scope, registry publication, production operations, authenticated
multi-process hardening and a learner pilot remain open. The capstone release
text and README document these limits in English while the Polish learner
lessons remain unchanged.

## Independent review findings and responses

The implementation review covering transaction, recovery and lifecycle behavior
found that replay receipts, changed-payload conflicts, failed migrations,
disconnect-after-enqueue accounting, absolute frame deadlines and worker
supervision needed explicit deterministic evidence. The response kept the
transaction and receipt updates atomic, preserved the original replay sequence,
added failed-migration marker checks, added acceptance/dequeue/response barriers,
and kept bounded worker join and child-process watchdogs. The authored stable
and exact MSRV workspace checks passed before the later mutant timeout
blockers.

The learner-evidence review found that blank-page work must remain open-ended,
solution exposure must not silently create mastery, and package/browser evidence
must be separated. The response preserves six blank tasks with no starter code
or prescribed signatures, keeps six coding reviews separately registered,
exposes all primary gate refs only through the solution package, restricts
starter preview refs to directly disclosed answers, and tests draft/note resume
plus package exposure in the browser and offline harness. These checks do not
claim learner-pilot or seniority evidence.

## Files changed

- `tests/e2e/capstone-integration.spec.ts` — bounded mocked-runner learner path.
- `scripts/verify-offline.mjs` — capstone draft/note and byte-stable ZIP checks,
  while retaining all prior package checks including Miri Safety.
- `src/content/projects/durable-log-service/package.test.ts` and `archive.ts` —
  exact exposure and release-limit assertions.
- `src/content/projects/durable-log-service/store.ts` — folded the redundant
  schema source into `store.rs` so the authored archive has the required 35 files.
- `README.md`, `docs/advanced-curriculum.md`, `docs/requirements-audit.md`,
  `docs/verification.md` and `docs/ci-cd.md` — current counts, bounded scope,
  CI order and release limitations.
- `docs/evidence/capstone/` — tracked stable/MSRV JSON reports and the exact
  revision/command metadata needed to review the failed archive runs.
- Current capstone additions in `docs/requirements-audit.md`,
  `docs/verification.md` and `docs/ci-cd.md` — translated to English as
  repository audit/CI documentation; learner-facing Polish content and
  historical documentation were left unchanged.
- Existing CI ordering assertions — updated to recognize the capstone verifier
  between FFI and generic Cargo archive checks.

The core archive and E2E fixes are committed in `82e2406` (`Strengthen
capstone exposure audit`). The final all-35-file starter audit, this report and
the tracked JSON copies under `docs/evidence/capstone/` are committed in the
follow-up review commit. The JSON files remain the exact failed verifier
outputs from revision `82e2406`.
