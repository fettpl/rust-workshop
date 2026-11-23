# Rust runner boundary

[Polski](runner.pl.md)

The application never invokes `rustc`, `cargo`, a shell, or another local child process for learner code. `POST /api/run` validates a small JSON request and sends it to an isolated remote runner. The default adapter is `PlaygroundRunner`, which calls the fixed official endpoint `https://play.rust-lang.org/execute`. A deployment can set `RUST_RUNNER_URL` to a fixed HTTPS endpoint and use `RemoteRunner`; the URL is read from server configuration and is never accepted from the browser request.

The adapter sends the current Rust Playground execute shape as one JSON object containing `channel: "stable"`, `mode: "debug"`, `edition: "2024"`, `crateType`, `tests`, `backtrace`, and `code`. Run mode uses a binary crate. Test mode uses a library crate with `tests: true` and appends curriculum test fixtures supplied by the client inside a `#[cfg(test)]` module. Test counts are returned only when the upstream test summary contains numeric passed and failed counts; the adapter does not infer a pass from an exit status alone.

The endpoint has a 64 KiB learner-code limit, a 32 KiB hidden-test limit, a 100 KiB request limit, a 128 KiB returned stream limit, a 12 second request timeout, and a small process-wide concurrency queue. These limits protect the local web server from oversized requests and stalled upstream calls. The upstream Playground documents that its compiler containers have no network access and apply memory and execution-time limits; its repository also describes Docker isolation. Those controls belong to the remote service and should be independently reviewed before deploying another `RUST_RUNNER_URL`.

Upstream compiler and program output remains verbatim in `stderr` and `stdout` (subject only to the explicit output cap). The adapter classifies known outcomes as `success`, `compile-error`, `runtime-error`, `test-failure`, `timeout`, or `infrastructure-error`. It extracts lightweight diagnostics from unstructured Rust compiler headings for navigation, while preserving the original text for learning feedback. A network error, malformed response, HTTP error, queue rejection, or timeout is infrastructure feedback and does not mark a learner attempt wrong.

The route accepts `POST` JSON only. If an `Origin` header is supplied, its host and port must match the browser-facing Host header (falling back to request.url for direct tests). This accommodates Next's internal localhost URL without allowing arbitrary origins. Forwarded-host is not trusted. The route does not accept a runner URL, headers, environment values, or secrets from the request body.

## Upstream references

- [Rust Playground source repository](https://github.com/rust-lang/rust-playground) — current architecture, container isolation, and resource-limit notes.
- [Official Playground](https://play.rust-lang.org/) — current running service. API payload verified against the service on 2026-09-12.

## Verification

Tokio lessons use a maintainer-only `trustedFixtureTarget`. It is never sent as a runner parameter: browser requests still contain only code, mode and optional tests, and the Playground adapter keeps its fixed payload. A read-only review of the [generated Playground compiler manifest](https://github.com/rust-lang/rust-playground/blob/master/compiler/base/Cargo.toml) on 2026-09-12 found the exact `tokio = "=1.53.1"` pin and support for the profile-relevant `rt`, `sync`, `time`, `test-util` and `io-util` features, plus `tokio-stream = "=0.1.19"`. The generated manifest has additional service features, so it is evidence of upstream availability rather than this repository's fixture boundary. No external Playground execution was used to choose this profile.

For reproducible authoring checks, `scripts/fixtures/tokio-runtime-1.54.1` owns an exact Tokio dependency with `macros`, `rt`, `sync`, `time`, `test-util`, `io-util` and `net`, plus tokio-stream =0.1.19 with default features disabled and Cargo.lock. ReceiverStream is available without the tokio-stream `sync` feature; that optional feature enables additional wrappers and an unnecessary tokio-util dependency for this stage. The profile preflight drives real duplex I/O and drains a closed ReceiverStream with a pre-issued permit. The Tokio 1.54.1 [Cargo manifest](https://raw.githubusercontent.com/tokio-rs/tokio/tokio-1.54.1/tokio/Cargo.toml) is the source-backed feature reference: `test-util` depends on `rt`, `sync` and `time`. `npm run content:tokio -- --fetch` performs a controlled fetch of this fixed lockfile and then verifies registered repository examples in a temporary directory with offline, locked Cargo commands. Subsequent `npm run content:tokio` needs only the cached dependencies. This covers visible examples, expected compiler diagnostics, unfinished starters, reference solutions, blank-page tasks and review exercises. The std-only `content:rust` verifier rejects unknown targets and leaves declared Tokio fixtures to this separate check; CI requires both.

The TCP stage adds a fifth fixed-profile preflight: a listener bound to `127.0.0.1:0`, a client in the same process, request EOF after write shutdown, and a response read through the still-open read direction. All authored network fixtures use IPv4 loopback; no free-port probe, public host or DNS lookup is needed. This local execution checks the actual OS socket path. It is not a test of the deployed Playground service.

A read-only check on 2026-09-13 found `net` in the [generated Playground Tokio feature list](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/Cargo.toml) and `--net none` in the [compiler coordinator](https://github.com/rust-lang/rust-playground/blob/main/compiler/base/orchestrator/src/coordinator.rs). [Docker's none-driver documentation](https://docs.docker.com/engine/network/drivers/none/) specifies IPv4 loopback inside that container and no configured IPv6 loopback. Together these sources support same-execution IPv4 client/server exercises, but do not prove the currently deployed service accepts every fixture. No external execution request was made for this check.

The std authoring verifier permits 60 seconds per compile and 8 seconds per executable, matching the separation already used by the Tokio verifier. CI run 34720429657 reported `spawnSync rustc ETIMEDOUT` on the first compile under the old shared 8-second budget. Process-boundary regression tests model a slow compiler and reject killed processes even when partial stdout contains a test report. These maintainer-only budgets do not change the application runner limit.

The authoring verifier accepts neither source nor paths on its command line and is never called by an application request. A dependency failure, timeout, missing executable or zero-test run is a verification failure, not evidence that a wrong solution was rejected. Code-less compiler errors are checked against an actual Rust diagnostic on the authored source; the learning UI preserves that message without inventing an E-code.

The public API stage uses the existing std-only browser runner. Its separate `content:workspace` command extracts only the repository-authored Frame Protocol archive, checks Cargo metadata against the declared virtual-workspace members, and exercises library-only and whole-workspace feature configurations. `--msrv` selects the exact Rust 1.85.0 toolchain for starter checks and reference tests, Clippy and rustdoc. These maintainer commands accept no learner paths, source code, manifests or arbitrary toolchain selectors. The app does not run Cargo or award mastery from a downloaded workspace or local command checklist.

Deterministic adapter tests use a fetch boundary fixture and assert the serialized request, status mapping, output preservation, limits, timeout, and HTTPS validation. Run them with:

```sh
npm test -- --run src/runner/runner.test.ts src/app/api/run/route.test.ts
```

The live smoke check is intentionally separate because it depends on the availability of `play.rust-lang.org`:

```sh
npm run dev
# In another terminal:
node scripts/smoke-runner.mjs
```

The five fixtures check output, E0382, successful tests, failed tests, and a runtime panic through the application API. Set `RUST_WORKSHOP_URL` to another local application address when needed.

Curriculum test fixtures are hidden from the exercise UI, not confidential: this is an open local learning tool. Browser data and imported evidence are not authenticated exam submissions. Standard assertion macros are qualified to prevent accidental shadowing by learner macros. A high-stakes assessment would additionally need server-owned exercise IDs, trusted evidence storage, and an independently reviewed execution service.

The current native profile and downloadable Tokio projects use 1.54.1 following
[RUSTSEC-2026-0386](https://rustsec.org/advisories/RUSTSEC-2026-0386.html).
The authored examples do not use its affected `AsyncFd` constructors; the
version-level issue still requires a patched current graph. Historical
`cargo-tokio-runtime-1.53.1` metadata retains its identity and is excluded from
the current native case inventory. Existing proof receipts and the dated
Playground inspection above are not rewritten as proof for the new profile.
The deployed Playground dependency version and patch status were not verified
for this refresh. Updating this repository's native profile does not patch the
third-party Playground service; the dated source inspection and absence of
authored `AsyncFd` calls do not establish that service's patch status.
