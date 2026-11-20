# Task 4 report: Polish lessons and independent assessment contracts

Reviewed base commit: `6adebf2513741d61ff226d1e525a3c75d3bf1a41`

Implemented the bounded capstone content for `capstone-integration`:

- six ordered Polish lessons with the required prediction, contrast, explanation, recall, transfer and project context;
- six concepts and six competencies with prerequisite graphs, misconception-specific prompts and independent review exercises;
- twelve evidence gates with exact IDs and criteria;
- six true blank-page portfolio tasks with no starter code or prescribed function signatures; rubric evidence is explicitly separate from automatic mastery;
- 24 std-only Rust assessment contracts: canonical and structurally different equivalent implementations pass, while compiling mutants fail named behavior assertions;
- starter behavior is compiled and run separately and fails through unfinished `todo!()` behavior;
- eight reviewed source entries with pinned Tokio/rusqlite URLs and current review date;
- `durable-log-service` project registration, package exposure references, module registration and the available capstone roadmap entry;
- catalog assertions updated to the delivered counts.

## Validation

Commands run from `<maintainer-home>/Documents/GitHub/rustcrushcourse`:

| Command                                                                                                                           | Result                                                                                                                                         | Scope / limit                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                                               | PASS                                                                                                                                           | TypeScript compiler, no emit                                                                                           |
| `npm run content:check`                                                                                                           | PASS                                                                                                                                           | `Content valid: 164 lessons, 167 concepts, 7 traces`                                                                   |
| `npm test -- --run src/content/capstone-integration-integration.test.ts src/content/projects/durable-log-service/package.test.ts` | PASS                                                                                                                                           | 2 files, 11 tests                                                                                                      |
| `npm test -- --run src/content/capstone-integration-assessment.test.ts`                                                           | PASS                                                                                                                                           | 26 tests; 24 contracts plus coverage/starter checks; rustc subprocess timeout 60 s compile / 8 s execution per fixture |
| `npm run content:rust`                                                                                                            | PASS                                                                                                                                           | repository Rust-content verifier on `rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`                                   |
| `npm test -- --run`                                                                                                               | PASS                                                                                                                                           | 68 files, 419 tests                                                                                                    |
| `rg -n -i '\\b(java                                                                                                               | python)\\b' src/content/capstone-integration* src/content/projects/durable-log-service.ts src/content/projects/durable-log-service/archive.ts` | PASS                                                                                                                   | no learner-facing Java/Python references |

The first full-suite run failed only because an existing catalog integration assertion still expected the pre-capstone counts (42/158/161/113/300/12). That assertion was updated to the required delivered counts; the rerun passed all 419 tests.

## Limits

This task validates browser-model contracts and authored Rust fixture behavior. It does not claim to execute learner source, SQLite, TCP, stable/MSRV archive verification, package publication, live advisory review, or production deployment. The exact MSRV and restricted archive checks belong to the later capstone verification task.

## Round-one review fixes

The review pass preserves the exact six lessons, twelve evidence gates, six blank tasks, six independent reviews, and twenty-four Rust fixtures. It makes committed-but-undelivered an explicit incident outcome, keeps receipt sequences stable on replay, makes commit updates atomic across bounded rows/receipts/sequences, separates connection capacity from storage queue capacity, models payment identity as `(account, external_id)` plus payload, rejects future release observations, and keeps migration schema markers unchanged after failed upgrades. Learner prompts, hints, review prompts, and prediction feedback now state each domain's bounds, alphabet, normalization, or observation window in Polish. Mastery integration now demonstrates that blank-only evidence cannot establish retention and records the six registered reviews independently.

Validation for this review pass: `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 files, 33 tests); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 files, 420 tests); and `git diff --check` PASS. Rust fixture subprocess limits remain 60 s compile / 8 s execution per fixture.

## Round-two review fixes

Base commit: `ecf7d79e506f7ad530b1697397fb90a1f8143c21`. The round-two changes make the incident recall fixture return a distinct `CommittedUndelivered` result, count attempt/committed/delivered signals separately, enforce ASCII references with exact 1–6 / 1–10 byte shipment bounds, align review prompts with their executable interfaces, give each review contract specific Polish hints, use an independently registered review for delayed mastery, and replace the error-code equivalent's arm reorder with an indexed lookup. The six lesson, twelve gate, six blank, six review, and twenty-four fixture counts are unchanged. Final head and validation tree are recorded below after commit.

Round-two validation tree: head commit `06d47acd65723b66d5ed428f3b93550b7b68dcf1`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 files, 33 tests); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 files, 420 tests); and `git diff --check` PASS. Rust fixture subprocess limits remain 60 s compile / 8 s execution per fixture.

## Round-three review fixes

Base commit: `ef3456f330e2fc57b804f4c0198d588439f453df`. Release-decision wording now delegates timestamp freshness to the preceding freshness gate while its boolean contract checks only compatibility, recovery, and known supply chain. Coding hints are keyed by exact contract ID, including the 6/10-byte domain recall and stable error-code mapping. Shipment references remain ASCII while destinations accept UTF-8 within the byte bound; the independent review uses a distinct implementation and tests Unicode plus overlong bytes. The lifecycle review explicitly returns a boolean. Counts and learner-facing Polish content remain unchanged.

Round-three validation tree: code head commit `496d3b608bf911d0724d092c7e14e7ccc7120a94`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 files, 33 tests); `npm run content:rust` PASS (`rustc 1.98.1 (48a229cea 2026-09-01) (Homebrew)`); `npm test -- --run` PASS (68 files, 420 tests); and `git diff --check` PASS. Rust fixture subprocess limits remain 60 s compile / 8 s execution per fixture.

## Final wording fixes

Base commit: `bb499501db9d44313e8d3e204f75884cd0f2a443`. The domain validation hint now distinguishes the ASCII identifier from the UTF-8 message, and the lifecycle recall hint uses the contract's `Done` outcome. Counts and executable contracts are unchanged.

Validation tree: code head commit `7908fe65d8d1a09601e0b39996fd4d5c9b8766cd`. `npm run typecheck` PASS; `npm run content:check` PASS (`Content valid: 164 lessons, 167 concepts, 7 traces`); `npm test -- --run src/content/capstone-integration-assessment.test.ts src/content/capstone-integration-integration.test.ts` PASS (2 files, 33 tests); and `git diff --check` PASS.
