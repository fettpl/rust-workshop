# Tokio TCP and bounded service implementation plan

> **For agentic workers:** Use parallel authors and independent review; preserve the existing course architecture and runner boundary.

**Goal:** Turn the current I/O, cancellation and blocking contracts into real TCP practice and a downloadable service with bounded admission and accounted shutdown. This is one stage of the approved full advanced curriculum, not completion of that goal.

**Architecture:** Add one data-driven `tokio-network-service` module after `tokio-blocking-work`, four lessons and a separate `tokio-service-workshop` package. Reuse the exact Tokio 1.53.1 authoring target, enabling net in its fixed manifest. The app continues sending only code/mode/tests to its existing runner.

**Tech stack:** Rust 2024, Tokio =1.53.1, existing Next.js/IndexedDB/PWA application.

## Design decisions

- Use real IPv4 loopback sockets, bound to port 0, with the bound listener retained until tests finish. Avoid free-port probes, public hosts, fixed ports and DNS dependencies. All local executions use reviewed repository code, never learner drafts or imports.
- TCP is a byte stream. Framing remains u16 big-endian with a policy limit checked before allocation/output. A successful write or flush does not prove remote application processing.
- Half-close ends only the write direction; read remains usable. Distinguish dropping a whole stream, owned halves and explicit shutdown.
- A frame has one absolute deadline spanning all its reads or writes. Incomplete framing after timeout is terminal for this connection; do not silently retry a partially sent request or reset the budget for each chunk.
- Reserve capacity before accept/spawn. The OS listen backlog is separate from application admission. Retain a permit through actual handler completion; stop disables acceptance, drops the listener and joins every accepted child.
- The package combines framing and a bounded Tokio pipeline with finite blocking work. A started blocking closure is not stopped by dropping its async waiter; a timed-out request must still account for it before releasing capacity. No unbounded tasks waiting for permits.
- Preserve I/O errors, domain errors, timeouts and JoinError separately; use internal connection identity, not client payloads as unique keys. Runtime/OS errors must not be presented as invalid learner answers.
- The educational service is loopback-only. TLS, authentication, deployment, operational telemetry and full failure recovery remain explicit later requirements, not implied capabilities.

## 1. Environment and authoring boundary

Files: `scripts/fixtures/tokio-runtime-1.53.1/{Cargo.toml,Cargo.lock,src/lib.rs}`, `docs/runner.md`, existing verifier tests where needed.

- [x] Read pinned TcpListener/TcpStream/halves docs and official Playground source. Record precise cancellation and environment limits; no external runner POST.
- [x] Add `net` to the exact Tokio feature set, refresh the lockfile and fetch only fixed dependencies.
- [x] Add a preflight that binds `127.0.0.1:0`, connects/accepts concurrently, sends bytes, half-closes, receives the reply and observes EOF. Run the fixed profile offline/locked. This is a local socket test, not proof of deployed Playground behavior.

## 2. TCP and half-close lessons

Owner file: `src/content/tokio-tcp.ts`.

Lesson IDs: `tokio-tcp-connect`, `tokio-tcp-half-close`.
Concept IDs: `tokio-tcp-ownership`, `tokio-tcp-directional-shutdown`.
Exports: `tokioTcpLessons`, `tokioTcpConcepts`, `tokioTcpCompetencies`, `tokioTcpSources`, `tokioTcpReviewExercises`.

- [x] Start first lesson after lesson/concept `tokio-blocking-cooperative-stop`; second follows first.
- [x] Teach connect, accept, local/peer identity, byte-stream semantics and owned stream lifetime through prediction/run/explanation before coding.
- [x] Require two distinct executable contracts per concept: one modify/debug gate and one blank task with no starter. Use IDs `<lesson>-gate` and `<lesson>-blank`; a separate fresh coding review uses `review-<concept>`.
- [x] For connect/accept, return the still-usable owned stream after completing a preamble and verify exact bytes, suffix preservation and errors.
- [x] For half-close, test both a client that signals request EOF before reading the response and a writer-half shutdown that leaves reading usable. Do not infer packet boundaries from writes or require exact read chunk sizes from TCP.
- [x] Verify reference fixtures and behavioral mutants. Coordinate peer completion with channels/futures; always clean up. A watchdog or arbitrary sleep is not proof of an invariant.

## 3. Deadline and admission lessons

Owner file: `src/content/tokio-network-lifecycle.ts`.

Lesson IDs: `tokio-frame-deadlines`, `tokio-admission-lifecycle`.
Concept IDs: `tokio-frame-absolute-deadline`, `tokio-admission-permit-lifetime`.
Exports: `tokioNetworkLifecycleLessons`, `tokioNetworkLifecycleConcepts`, `tokioNetworkLifecycleCompetencies`, `tokioNetworkLifecycleSources`, `tokioNetworkLifecycleReviewExercises`.

- [x] Chain prerequisites from `tokio-tcp-half-close` / `tokio-tcp-directional-shutdown`.
- [x] Gate and blank use IDs `<lesson>-gate`, `<lesson>-blank`; add a separate fresh review for each concept.
- [x] Read/write a bounded frame under one absolute deadline, preserve the original I/O error versus timeout and document discarding the connection after incomplete framing. Test delayed chunks whose individual delays fit but total exceeds the budget, success before deadline, EOF, truncated data and bounds. Use paused Tokio time for deterministic timing tests, with real TCP covered separately.
- [x] Gate admission on a permit before accept, with stop winning when already observed, dropped stop sender treated explicitly, and the returned permit owned by the accepted work.
- [x] Independent blank keeps the permit inside a spawned connection handler through success, error and actual completion; review closes the listener before joining outstanding accepted work. Distinguish OS backlog from admitted active handlers.
- [x] Reject skipped limits, renewed per-chunk deadlines, early permit release and unjoined work through observable assertions.

## 4. Downloadable service project

Owner file: `src/content/projects/tokio-service.ts` (additional focused source files allowed within that prefix).

Exports: `tokioServicePackage`, `tokioServiceProject`. Package ID `tokio-service-workshop`; project ID `tokio-service`.

- [x] Deliver a compiling unfinished starter and complete reference: Cargo.toml/lock, small modules for protocol/service/processing, executable local demo, README, ADR and tests.
- [x] Validate finite positive configuration, frame limits and connection limits before side effects. Bind only IPv4 loopback in the demo, with an ephemeral port in tests.
- [x] Use the prior bounded pipeline principles with a real TCP request/response path and owned blocking processing. Bound both queued work and active work, and document retained report memory. No detached blocking work counted as finished.
- [x] Shutdown stops admission before draining accepted work and joins every child. Report clean EOF, protocol error, deadline, process failure and join failure honestly. Keep a shutdown owner until completion; Drop alone is not proof of shutdown.
- [x] Test multiple clients, framing boundaries, partial reads, oversized/truncated input, invalid configuration, worker capacity, pending clients, deadlines, peer disconnect and shutdown during admitted work. Check accounting and error preservation, not just a successful echo.
- [x] `revealStepRefs` exposes only the four primary `-gate` tasks, leaving each `-blank` fresh. Local package checks do not grant mastery.
- [x] Verify starter fmt/check plus expected unfinished-behavior failures, and reference fmt/check/test/Clippy. Include compiling mutants for capacity/shutdown/deadline invariants.

## 5. Integration and release

Root-owned files: `src/content/tokio-network-module.ts`, course registration, integration/package/E2E tests, offline script, PWA cache, README/audit/progress/verification docs.

- [x] Add a failing integration test for the new module, prerequisites, four independent gate pairs and package reveal behavior, then register authored arrays/project and make it pass.
- [x] Keep existing state and IDs intact. Test runner payload limits against all new hidden tests. New source references must use pinned official URLs.
- [x] Verify all authored standard/Tokio cases and all Cargo packages, typecheck/lint/Vitest, source audit, production build, browser navigation/mobile and offline draft/package resume.
- [x] Freeze authored content before final E2E/build; compare course fingerprint across the build. Capture failures accurately and fix causes before repeating relevant checks.
- [x] Obtain independent reviews of lesson semantics and service lifecycle and address material findings.
- Release: commit and push the verified milestone, then inspect CI for that exact commit. PR #1 is already merged; do not infer another merge request.
