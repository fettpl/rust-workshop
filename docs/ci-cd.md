# CI and local verification

[Polski](ci-cd.pl.md)

The current contract is defined by [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
It runs for pull requests targeting `main`, pushes to `main`, and manual
dispatches. The application is local-first: the workflow starts a local
production Next server for browser and offline checks, but it does not deploy
the app or select a hosting provider.

## The eleven checks

The workflow has seven job definitions and eleven checks after matrix expansion.
The configured job timeouts are part of the current contract:

| Check                                 | Runner and scope                                                                                       | Timeout |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------: |
| `verify`                              | Ubuntu stable Node/Rust; app, content, trusted fixtures, build, production browser, and offline checks |  60 min |
| `workspace-msrv`                      | Ubuntu exact MSRV verifiers (Rust 1.85.0 and Durable Log on 1.89.0)                                                  |  30 min |
| `mini-grep-fuzz`                      | Ubuntu nightly campaign plus stable/MSRV replay                                                        |  20 min |
| `profile-evidence`                    | Ubuntu stable Callgrind and DHAT evidence                                                              |  25 min |
| `allocation-evidence` (stable Ubuntu) | Ubuntu stable allocation evidence                                                                      |  25 min |
| `allocation-evidence` (MSRV Ubuntu)   | Ubuntu Rust 1.85.0 allocation evidence                                                                 |  25 min |
| `allocation-evidence` (stable macOS)  | macOS stable allocation evidence                                                                       |  25 min |
| `miri-safety`                         | Ubuntu stable, MSRV, and pinned nightly native proof                                                   |  60 min |
| `unsafe-borrowed-memory` (stable)     | Repository-authored fixture on stable Rust                                                             |  30 min |
| `unsafe-borrowed-memory` (MSRV)       | Repository-authored fixture on Rust 1.85.0                                                             |  30 min |
| `unsafe-borrowed-memory` (Miri)       | Repository-authored fixture on nightly Miri                                                            |  30 min |

`verify` installs the latest available Node 22 release (`check-latest: true`)
with npm caching, the current stable Rust toolchain with rustfmt and Clippy,
and the locked npm graph. The major selector is not
an exact runtime pin: the selected release must satisfy the Node floor in
`package.json` (currently 22.23.4 for Node 22); record the actual installed
version. It qualifies the stable
`rustup`, `rustc`, `rustdoc`, and `cargo` executables by recording their paths,
versions, and file hashes, then prepares an offline Cargo configuration for the
initialized-prefix unit proof. It fetches the fixed Tokio profile before
running native checks:

```sh
npm ci
cargo fetch --locked --manifest-path scripts/fixtures/tokio-runtime-1.54.1/Cargo.toml
```

The job then runs native runtime and audit checks, lint, TypeScript, generated
project assets, the full Vitest suite with the authorized native-proof inputs,
curriculum/content verifiers, the stable API and macro contracts, Cargo
archive/workspace/manifest/source audits, and the production build. It installs
Playwright Chromium, starts Next on loopback port 3002, runs the production
browser suite with zero retries, and runs `npm run test:offline` against that
same server. The browser runner is controlled test data; it is not proof about
arbitrary learner code.

After generating project assets, `verify` uses the pinned `cargo-audit 0.23.0`
release to check the actual `Cargo.lock` bytes inside starter and solution
downloads at the canonical, English, and Polish URLs. It includes nested
lockfiles and tracked lockfiles under `scripts/fixtures/`. The report records
all origins for each distinct lockfile SHA-256 and identifies the File Schema
Evolution ZIPs that ship without a lockfile. The verifier fetches one official RustSec Advisory
Database snapshot and records its Git revision. It scans offline from a
temporary directory using explicit lockfiles and leaves registry yank status
outside the check. Crates.io vulnerability and unsoundness advisories, missing
inputs, and failed or incomplete scans fail `verify`. To reproduce the check
locally with the pinned tool on `PATH`, run `npm run content:packages` and
`npm run audit:rustsec`. CI retains `test-results/rustsec-audit/report.json`
in the `rustsec-audit-report` artifact. [RustSec Advisory Database](https://github.com/RustSec/advisory-db) · [cargo-audit 0.23.0](https://github.com/RustSec/rustsec/releases/tag/cargo-audit/v0.23.0)

The **Audit shipped Rust dependencies** workflow scans `main` every Monday
at 04:17 UTC and supports manual dispatch on `main` from the Actions tab.
It uses the same checksum-pinned installer and scanner as `verify`, generates
the download archives, and runs on a single Linux runner. The run fails if
the audit fails and retains the report whenever the audit step runs. Required
PR checks still include the RustSec scan in `verify`.

`workspace-msrv` uses the exact Rust `1.85.0` `cargo`, `rustc`, and `rustdoc`
paths for the Frame Protocol workspace, Number Guessing+, manifests, API and
macro contracts, and the evidence assessment suites. Durable Log Service and
Durable Log Retry use exact Rust `1.89.0`, which their bundled SQLite dependency
requires. The offline archive verifier `content:cargo -- --msrv` selects the
minimum for each project. The job also fetches the fixed Tokio lockfile before
offline native checks. Both jobs run the authored property contract verifier.

`mini-grep-fuzz` installs the pinned nightly distribution
`nightly-2026-08-08`, exact Rust `1.85.0`, and `cargo-fuzz 0.13.2`. The nightly
campaign and stable/MSRV replay are separate evidence phases. Reports, raw
logs, corpus, and original/reduced artifacts are retained even when the job
fails. Missing instrumentation, provenance, normal completion, or a fresh
artifact is a failure or infrastructure result, never a green evidence claim.

`profile-evidence` installs Valgrind if the Ubuntu image does not provide it,
then collects fresh Callgrind and DHAT reports with:

```sh
npm run content:profiles -- --fetch --profile=callgrind
npm run content:profiles -- --fetch --profile=dhat
```

`allocation-evidence` runs `npm run content:allocations -- --fetch` on stable
Ubuntu and macOS, and `npm run content:allocations -- --fetch --msrv` on exact
Rust 1.85.0 Ubuntu. Each matrix entry regenerates and hashes both archives,
runs formatting, Cargo tests, and Clippy offline, and compares separate
baseline, candidate, and materialization-mutant processes over the fixed
workloads. The report is bounded evidence for the authored counter; it makes
no RSS or universal-threshold claim.

`miri-safety` installs stable, Rust 1.85.0, and nightly
`2026-08-08` with `miri` and `rust-src`. It prepares the Miri sysroot, writes an
offline Cargo configuration, qualifies all selected executables and their
versions, records sysroot file hashes, and runs the stable and MSRV native
proofs. `unsafe-borrowed-memory` runs the authored verifier once for each of
stable, `1.85.0`, and `nightly-2026-08-08`/Miri. Stable and MSRV invocations may
execute only the authored `safe-behavior` fixture checks. Authored
undefined-behavior negative fixtures use metadata-only compilation and are
selected only by the pinned Miri path; they are never executed natively,
including with fixed trusted inputs. These checks use only fixed repository
fixtures; Miri and
undefined-behavior metadata are never learner execution or a claim of general
native safety.

All third-party actions are currently pinned to full commit SHAs as a project
choice. GitHub's current guidance describes workflow dependency lockfiles as
the strongest protection where a repository can adopt them, and full-SHA pins
as the fallback. Preserve least-privilege `contents: read`, credential-free
checkout, and the absence of privileged `pull_request_target` execution when
reviewing workflow changes.

## Fork trust, caches, artifacts, and cost

The tracked workflow uses `pull_request`, `push` to `main`, and manual
`workflow_dispatch`; it has no `pull_request_target` or `workflow_run`
consumer. Every job uses `contents: read`, checks out without persisted Git
credentials, and runs on standard `ubuntu-latest` or `macos-latest`
GitHub-hosted runners. It references no repository or environment secrets,
OIDC permission, deployment environment, self-hosted runner, or publish step.
The shell expressions use repository-defined matrix values and workspace
paths, not PR titles, bodies, or branch-provided command inputs. PR code still
executes package installation scripts and authored checks, so review proposed
workflow and script changes before approving a fork run. Approval permits
execution; it does not make the contribution trusted.

Fork approval policy, allowed actions, token defaults, branch protection and
required checks are GitHub settings, not facts established by this YAML.
Recheck their effective values in the live UI at integration and publication,
including any organization policy. Keep fork runs away from secrets, write
tokens and maintainer machines. Do not enable privileged fork execution to
make a required check run.

`setup-node` caches npm download data; `npm ci` still installs the locked
graph in every job. No workflow step downloads another run's artifacts or
executes an artifact. Fork PRs can read eligible base-branch caches, so caches
must never contain credentials, learner exports or private reports. Cache
scope and access are not an integrity or confidentiality guarantee; a cache
hit is not verification evidence. A future privileged consumer must not
execute code or artifacts produced by an untrusted run.

Uploads use scoped report/diagnostic paths and seven-day retention. The
initialized-prefix job uploads only its public summaries, leaving its raw
native packet out of uploads. Review new artifact paths and report contents
before extending them. Retention limits lifetime, not access or proof:
public-repository logs are public, and signed-in readers can download retained
artifacts. Never put secrets or private audit inputs in either. Missing
reports, incomplete campaigns and diagnostic uploads do not satisfy checks.

All eleven checks and their timeouts remain required by the current contract.
Concurrency cancels obsolete PR runs while preserving running `main` jobs.
Under GitHub's current rules, standard hosted runner execution is free for
public repositories; private usage, storage, larger runners and other products
have separate rules. This is not evidence about current account restrictions,
accrued charges or effective repository settings. Do not reduce checks, buy
capacity, change budgets or switch to maintainer machines to work around a
blocked gate. Follow the [publication handoff](publication-handoff.md) for
external verification.

## Local verification

For a fresh checkout, use a supported Node version (`^22.23.4 || ^24.22.1 || ^26.12.1` in
`package.json`) and run:

```sh
npm ci
cargo fetch --locked --manifest-path scripts/fixtures/tokio-runtime-1.54.1/Cargo.toml
npm run lint
npm run typecheck
npm run content:check
npm run content:packages
npm test
```

The fetch only prepares the locked dependency cache. Native checks that consume
it remain `--offline --locked`; a successful fetch is not behavioral evidence.
The normal local `npm test` run may honestly skip the initialized-prefix unit
proof when the CI authorization inputs are absent. To authorize that proof,
the run must have all of the following from a real qualification step: an
offline Cargo config, stable executable paths and version/hash records, the
artifact directory, and the proof output awaited to completion. Never set an
authorization flag by itself and never convert missing inputs, an unavailable
tool, timeout, dependency failure, or incomplete report into a pass or a
selective skip.

Use the package generator before checks that inspect served project archives:

```sh
npm run content:packages
```

Useful focused commands, all defined in `package.json`, include:

```sh
npm run content:rust
npm run content:tokio -- --fetch
npm run content:async-lending -- --fetch
npm run content:guessing -- --fetch
npm run content:property -- --fetch
npm run content:workspace -- --fetch
npm run content:capstone -- --fetch
npm run content:cargo
npm run content:manifests
npm run content:audit
```

`content:cargo` checks the authored archives offline and locked; it does not
populate the registry cache. Generating ZIP files is also not dependency
preparation. A fresh local cache needs the fixed Tokio fetch above and the
relevant package-specific `--fetch` verifiers before those archive checks.
For example, `content:models -- --fetch` prepares the Loom graph,
`content:performance -- --fetch` prepares Criterion, and
`content:property -- --fetch` prepares property-test dependencies. Follow each
verifier's documented prerequisites and keep its fixed repository inputs;
missing cached crates are infrastructure failures, not failed learner behavior.
CI performs these preparation phases explicitly. Do not make an offline
behavioral check silently retry online or substitute an arbitrary manifest.

The closed Log Analyzer investigation uses `npm run content:performance -- --a7`
and `npm run content:performance -- --a7 --msrv` after the existing Criterion
cache preparation. These modes remain offline and locked. Each invocation
preserves a unique `test-results/performance-a7/a7-<mode>-<id>/` report directory,
including raw command output and Criterion triplets. The result distinguishes
correctness, run completeness, the named negative control, and confidence-interval
comparison; overlap is a valid inconclusive measurement. CI uploads only those
run directories, excluding reusable target caches. See the
[investigation contract](performance-investigation.md).

Use `--msrv` only with the verifier that documents it, after installing and
qualifying the documented exact Rust version. The baseline is `1.85.0`, and
the Durable Log Service and Durable Log Retry verifiers require `1.89.0`.
Specialized commands reject arbitrary paths,
source, dependency overrides, and arbitrary toolchain selectors. Heavy native
and browser checks should run serially when resources are limited; mocks are
useful for request/UI/state contracts but are not compiler, runtime, archive,
or native-tool proof.

Production browser and offline checks are separate from ordinary unit tests:

```sh
npm ci
npm run build
npm start -- --hostname 127.0.0.1 --port 3002
# In another terminal:
npx --no-install playwright install chromium
npx --no-install playwright test --config .github/playwright.production.config.ts
npm run test:offline
```

The production server must bind loopback and remain running for both checks.
Use the current [runner boundary](runner.md) to distinguish controlled API
responses from actual compiler evidence. Use
[verification.md](verification.md) and
[initialized-prefix-evidence.md](initialized-prefix-evidence.md) for the
maintained evidence scope and exact historical proof references; do not copy
dated run history into this operational guide.

## Reporting and integration

Record the command, selected toolchain, actual versions and executable paths,
freshness, artifact/report identity, and any limitation. A compiler error,
timeout, signal, missing dependency, unavailable runner, zero-test run, or
permission failure is not a mutant result or a learner failure. Retained
artifacts help diagnose failures; they do not make an incomplete run pass.

Before an ordinary merge, obtain independent review and fresh successful
required checks on the exact PR head. Merge through the repository's normal
path and verify the resulting `main` commit with fresh checks. If Actions or a
required environment is unavailable, retain the local work and report the
blocker. Do not rerun around a gate, rely on an older green commit, or change
hosting, billing, visibility, or release settings from this document.

## References

External guidance checked 24 October 2026; recheck it at the actual handoff.

- [AGENTS.md format](https://agents.md/) — standard Markdown with no required
  schema; the nearest file takes precedence and explicit user instructions win.
- [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use)
  — least privilege, untrusted pull-request boundaries, action dependency
  lockfiles, and full-SHA fallback guidance.
- [Rust runner boundary](runner.md) — remote learner execution and trusted
  local fixture limits.
- [Verification records](verification.md) — scoped evidence and limitations.
- [Approving fork runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)
  — review workflow changes before allowing execution; effective approval rules
  are repository, organization or enterprise settings.
- [Dependency cache access](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
  — cache scope, fork read access and sensitive-data restrictions.
- [Artifact access](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
  and [visibility effects](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
  — retained artifacts and logs are part of the release-surface review.
- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
  — standard public runner execution and separate storage/account constraints.
