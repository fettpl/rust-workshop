# Contributing to Rust Workshop

Thank you for helping improve a Polish, local-first Rust learning workspace.
Contributions are welcome in code, learner content, tests, documentation, and
focused interface improvements. Please read [AGENTS.md](AGENTS.md) before
changing the repository; it explains the architecture, evidence boundaries,
persistent IDs, and maintainer checks.

Read the [history redaction notice](docs/history-redaction.md) before interpreting
historical fixture hashes or report presentation copies. Preserve the frozen
receipts and the closed reviewed maintenance exceptions.

## Before you start

Use a supported Node version (`^22.23.4 || ^24.22.1 || ^26.12.1`) and install the locked npm
dependencies:

```sh
npm ci
npm run dev
```

The app can be served and its browser exercises can be explored without a
local Rust toolchain. Rust is needed for downloaded Cargo projects and for
trusted maintainer verification. The app never runs learner code, imported
code, or a local Cargo command; browser **Run** requests go through the remote
runner described in [docs/runner.md](docs/runner.md).

## Good contribution areas

- Improve learner-facing lessons, prompts, hints, explanations, and review
  tasks. Keep that material in Polish and explain Rust from first principles,
  without assuming Java, Python, or another language ecosystem.
- Add or repair exercises, evaluators, project contracts, and source
  references. Keep the contract observable and support it with real trusted
  Rust evidence where the change requires compiler or runtime behavior.
- Improve the React/TypeScript application, persistence, navigation, or focused
  UI behavior while preserving existing state and import compatibility.
- Improve tests, maintainer scripts, contributor documentation, or the
  generated Cargo project assets.

Preserve existing lesson, module, concept, review, project, source, and step
IDs. They are persistent contracts used by saved progress, review history,
imports, and evidence. When a change needs a new identity, add a new ID and
explain the compatibility impact in the pull request. Do not rewrite history
or manufacture independent coding evidence from a reveal, a mock response, an
import, or a repeated assisted attempt.

Keep learner-facing copy in Polish. Write new contributor documentation,
commit messages, and pull requests in English. No paid tool or hosted service
is required to contribute.

## Validation

Run checks that match the files you change. For a documentation-only change,
review links, commands, and claims without creating tests that merely copy the
prose. For code, content, evaluator, or persistence changes, run the focused
checks and report what you ran.

The quick checks are:

```sh
npm run typecheck
npm run lint
npm run content:check
```

For a production/offline pass, build and keep the server running in one
terminal:

```sh
npm run build
npm start -- --port 3002
```

In a second terminal, prepare Playwright Chromium and run the check:

```sh
npx --no-install playwright install chromium
npm run test:offline
```

On Linux, use `npx --no-install playwright install --with-deps chromium` if
Chromium system libraries are missing.

The full `npm test` suite includes trusted native Rust fixtures. Prepare the
stable toolchain and the locked Tokio cache as described in
[docs/ci-cd.md](docs/ci-cd.md) before running it. Some checks use exact Rust
toolchains or specialized tools. The initialized-prefix native proof requires
its documented offline setup and explicit qualified profile; it is skipped in
ordinary local runs unless the qualification is complete and
`RUST_WORKSHOP_INITIALIZED_PREFIX_CONTROLS_AUTHORIZED=1` is set. Report missing
toolchains, unavailable runners, permission failures, timeouts, and partial
runs as limitations. They are not successful behavioral evidence.

For a Cargo project downloaded from the app, follow that archive's README and
use its locked, offline commands after dependencies are prepared. Do not send
learner or imported files to maintainer verifiers, and do not use a local
compiler as a substitute for the app's remote execution boundary.

## Pull requests

Keep changes focused and avoid overlapping edits with another contributor.
Open a branch from the current base and make small, reviewable commits. The
pull request should state:

- what learner or maintainer problem changes;
- which files and persistent contracts are affected;
- which checks ran, including exact failures or skipped prerequisites;
- whether learner-facing text remains Polish;
- whether a real compiler/runtime check, a controlled mock, or a browser/state
  check provides each important piece of evidence.

Use the [pull request template](.github/pull_request_template.md). Review
feedback, including automated feedback, must be checked against the code and
tests before it is accepted or rejected. A browser test that intercepts a
runner response proves UI and saved-state behavior; it does not prove that
Rust compiled or ran in the remote service.

Do not include secrets, private attachments, personal account or billing
history, credentials, or machine-specific paths in commits, issues, pull
requests, logs, or fixtures. Read [SECURITY.md](SECURITY.md) for current
reporting limitations; do not disclose a suspected vulnerability in a public
issue.

## Contribution rights and licensing

The maintainer approved the following split and the project credit
**Pixel Media Workshop Paweł Borawski** (2026). Grants cover only rights the
project can grant. The [bounded rights assessment](docs/rights-assessment.md)
records the completed course source review and icon-origin acceptance; wider
release gates remain separate:

- MIT for application code, scripts, tests, evaluator machinery, programming
  examples, executable lesson code/solutions, and code in downloaded project
  archives;
- CC BY 4.0 for authored teaching narrative, exercise descriptions, didactic
  answer prose, explanations, and authored and approved original illustrations;
- the original license and required attribution for third-party material.

A TypeScript file may contain both executable code and authored lesson text.
Classify the portions by what they are: executable lesson code and solutions,
including functional comments and program literal/output strings, are MIT;
prompts, hints, explanations, feedback, and answer prose are CC BY 4.0.
Preserve notices when extracting or reusing them, and ask for maintainer
guidance when a contribution cannot be cleanly separated. Three existing
authored Cargo package manifests retain a narrow `MIT OR Apache-2.0`
expression with maintainer approval; this does not extend Apache to the
repository as a whole. See the current [licensing guide](docs/licensing.md)
for the repository's file-level, mixed-file, archive, and attribution rules.
The bounded course review found no actionable substantial copied-expression
case within its stated scope. The maintainer accepted the traced
assistant-generated icon origin on 24 October 2026 and confirmed that, to their
knowledge, no additional external icon file or reference was supplied. Both
scoped provenance blockers are resolved; this is not exhaustive copyright or
trademark clearance or permission to publish. Reassess any later concrete
source or rights finding. The maintainer reports that the course prepared for
this milestone was generated with ChatGPT and Codex Desktop using GPT-5.6 and later models for
drafting and research, from the maintainer's prompts and direction, with no
manual drafting of course fragments. This describes the workflow, not proof of
originality, copyright protection or third-party clearance.
For AI-assisted contributions, disclose their origin and identify known copied
or adapted sources and their licenses; do not assert that model output alone
proves originality or ownership. See the licensing guide for the distinction
between project credit, copyright protection, and third-party clearance.
The current release draft covers source, authored Cargo archives, and the
published audit surface; it does not publish a hosted deployment, compiled
browser application, `.next` directory, or `node_modules` tree.

Contributors keep their copyright. There is no CLA or copyright assignment in
this draft. Submit only work you created or are authorized to license, and
identify third-party material and its license in the pull request. A merged
contribution must carry clear permission under the applicable project license;
do not assume that a general MIT or CC BY statement covers someone else's
work. Do not add NonCommercial or NoDerivatives restrictions to the proposed
MIT or CC BY terms.

License selection and project credit are approved. This preparation does not
by itself clear source rights, make the repository public, or authorize
integration or publication before the required gates. Further license changes,
merge and publication decisions remain with the maintainer.
