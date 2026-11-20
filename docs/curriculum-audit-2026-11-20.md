# Local curriculum audit, 20 November 2026

Baseline: `e4093ef`. This audit followed a learner from choosing a lesson through answering, seeing feedback, trying another task, returning for review, and exporting or restoring progress. It also checked whether different saved histories can produce contradictory grades.

| Area | Coverage and method | Result |
| --- | --- | --- |
| Routes and learner actions | All 204 lessons across 51 modules, the 17-module core route and extension exits, 16 project routes. Checked lesson tasks and registered review exercises against their available inputs. | A missing lesson or removed step now offers a route back to the map before any unrelated task is opened. An explicitly chosen lesson opens at a valid step. |
| Authored answers | Surveyed 1,436 lesson steps and 204 review entries. Checked canonical evaluator inputs, wording, and whether meaningful alternatives are available. | 17 explanations in the capstone and async lending lessons now accept the learner’s own reasoning with explicit self-assessment criteria. Eight observation steps can be acknowledged directly. The ordering exercise presents an unordered list of named operations. Short technical answers distinguish Rust output and identifier case from wording that can reasonably vary. |
| Syntax constraints | Tested canonical and alternative Rust code as well as guard text appearing only in a comment or literal. | A lifetime, nested comment, raw string, or raw identifier no longer causes the documented false positives and false negatives. These checks recognize authored token patterns. Behavioral proof for executable tasks comes from the runner. |
| Independent practice | Exercised all 240 module criteria, 566 references to primary tasks, five supplementary criteria, and 110 authored solution-to-gate relationships. Compared earlier and later submissions, help, stale evaluator metadata, and historical versus current concept identifiers. | Imported successes must identify the actual task and supporting concepts. Reading a supplied implementation affects later credit. Prior independent work survives later help. Observation alone cannot establish a second strong result. |
| Prediction and feedback | Checked before-run prediction, a wrong prediction followed by output, corrective feedback on a choice, and saved attempts sharing a timestamp. | Learners can run a program after submitting a prediction. Seeing the answer through output or corrective feedback makes a subsequent answer on that item assisted. A correct prediction before seeing the result remains independent. |
| Retention and scheduling | Tested immediate and delayed recall, expected errors and rubrics, future-dated records, repeated sessions, and equivalent full review solutions under different concepts. | The interval and mastery checks use qualifying evidence and elapsed time since relevant contact. Repeating one registered ordinary review exercise counts once in the competency task count. A historical cached level alone does not establish current verified mastery. |
| Browser state and recovery | Exercised actual IndexedDB persistence, supported versions 1–3, competing tabs, failed writes, explicit replacement, pending file reads and compiler responses, restored rated sessions, and project retrospectives. | Stale tabs keep an exportable draft. A slow file read cannot replace the newer selection. A late compiler reply cannot overwrite a completed review. Project reminders retain prior scheduling history. The Log Analyzer lesson and project can keep independent notes, and their previously shared note is still accessible. |

## Independent review

GPT-6.1-Sol (high) reviewed assessment wording, evidence and local recovery, including the fixes across those areas. GPT-6.2-Astra (high) independently checked prediction grading, delayed recall after seeing an equivalent solution, and the final display behavior on the production build. In the CLI lesson, one reveal produced one source record. Returning from another step and then reloading added one record each. All three remained exposure-only and preserved the earlier history.

## Local verification result

Node 24.22.3 passed all 4,289 Vitest tests in 242 files, 306 production Chromium tests, the offline browser check, and 26 Node script tests. The production build, TypeScript check and catalog validation passed. ESLint reported 31 warnings and zero errors. The Rust verifier passed all 2,855 authored cases.

## Repeating the checks

The complete Vitest run includes the per-criterion, legacy-attribution, solution-contact, grading, state migration and persistence suites. The production Playwright run exercises the real UI and IndexedDB. To reproduce both on Node 24, follow the native fixture and production server setup in [the CI guide](ci-cd.md). Run `npm test`, `npm run test:e2e` and `npm run test:offline`. Run `npm run content:check` and `npm run content:rust` for the catalog and authored Rust cases. Cargo package verifiers have their own documented offline cache and toolchain requirements.

## Verification boundaries

The production browser suite includes journeys with a mocked compiler to isolate interface and evidence behavior. The Rust verifier compiles or runs the repository’s trusted examples independently. All 32 downloadable Cargo archives were compared byte-for-byte with their authored contents. The offline verifier compiled every starter and checked that its test run reached an unimplemented operation. Each solution passed its workspace tests and Clippy. The project work also included stable-toolchain checks for the modules whose assessments changed. Historical compatibility tests project the edited nodes back to their exact predecessors and check that unrelated changes remain detectable.

The course-wide checks exhaust the listed catalog entries and authored relationships for the scenarios above. The audit used Chromium, local native fixtures and synthetic learner histories. Learning outcomes for real students, arbitrary valid Rust implementations, every possible ordering of actions, and other browsers were outside the measured population.
