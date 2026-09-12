# Rust runner boundary

The application never invokes `rustc`, `cargo`, a shell, or another local child process for learner code. `POST /api/run` validates a small JSON request and sends it to an isolated remote runner. The default adapter is `PlaygroundRunner`, which calls the fixed official endpoint `https://play.rust-lang.org/execute`. A deployment can set `RUST_RUNNER_URL` to a fixed HTTPS endpoint and use `RemoteRunner`; the URL is read from server configuration and is never accepted from the browser request.

The adapter sends the current Rust Playground execute shape as one JSON object containing `channel: "stable"`, `mode: "debug"`, `edition: "2024"`, `crateType`, `tests`, `backtrace`, and `code`. Run mode uses a binary crate. Test mode uses a library crate with `tests: true` and appends curriculum test fixtures supplied by the client inside a `#[cfg(test)]` module. Test counts are returned only when the upstream test summary contains numeric passed and failed counts; the adapter does not infer a pass from an exit status alone.

The endpoint has a 64 KiB learner-code limit, a 32 KiB hidden-test limit, a 100 KiB request limit, a 128 KiB returned stream limit, a 12 second request timeout, and a small process-wide concurrency queue. These limits protect the local web server from oversized requests and stalled upstream calls. The upstream Playground documents that its compiler containers have no network access and apply memory and execution-time limits; its repository also describes Docker isolation. Those controls belong to the remote service and should be independently reviewed before deploying another `RUST_RUNNER_URL`.

Upstream compiler and program output remains verbatim in `stderr` and `stdout` (subject only to the explicit output cap). The adapter classifies known outcomes as `success`, `compile-error`, `runtime-error`, `test-failure`, `timeout`, or `infrastructure-error`. It extracts lightweight diagnostics from unstructured Rust compiler headings for navigation, while preserving the original text for learning feedback. A network error, malformed response, HTTP error, queue rejection, or timeout is infrastructure feedback and does not mark a learner attempt wrong.

The route accepts `POST` JSON only. If an `Origin` header is supplied, its host and port must match the browser-facing Host header (falling back to request.url for direct tests). This accommodates Next's internal localhost URL without allowing arbitrary origins. Forwarded-host is not trusted. The route does not accept a runner URL, headers, environment values, or secrets from the request body.

## Upstream references

- [Rust Playground source repository](https://github.com/rust-lang/rust-playground) — current architecture, container isolation, and resource-limit notes.
- [Official Playground](https://play.rust-lang.org/) — current running service. API payload verified against the service on 2026-09-12.

## Verification

Tokio lessons use a maintainer-only `trustedFixtureTarget`. It is never sent as a runner parameter: browser requests still contain only code, mode and optional tests, and the Playground adapter keeps its fixed payload. The reviewed prelude's public `/meta/crates` listing contained Tokio 1.53.1 on 2026-09-12; its features and future versions are controlled by the Playground. No new Tokio code was posted to the public service during this milestone's automated verification.

For reproducible authoring checks, `scripts/fixtures/tokio-runtime-1.53.1` owns an exact Tokio dependency, minimal macros/rt/sync features and Cargo.lock. `npm run content:tokio -- --fetch` performs a controlled fetch of this fixed lockfile and then verifies registered repository examples in a temporary directory with offline, locked Cargo commands. Subsequent `npm run content:tokio` needs only the cached dependencies. This covers visible examples, expected compiler diagnostics, unfinished starters, reference solutions, blank-page tasks and review exercises. The std-only `content:rust` verifier rejects unknown targets and leaves declared Tokio fixtures to this separate check; CI requires both.

The authoring verifier accepts neither source nor paths on its command line and is never called by an application request. A dependency failure, timeout, missing executable or zero-test run is a verification failure, not evidence that a wrong solution was rejected. Code-less compiler errors are checked against an actual Rust diagnostic on the authored source; the learning UI preserves that message without inventing an E-code.

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
