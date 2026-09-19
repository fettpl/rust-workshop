# Capstone archive evidence

These are the bounded verifier outputs produced from revision `82e2406`
(`Strengthen capstone exposure audit`) on 2026-09-18:

- `stable-report.json`: `npm run content:capstone -- --fetch`, with a 180-second outer alarm and the verifier's 120-second Cargo command limit.
- `msrv-report.json`: `npm run content:capstone -- --fetch --msrv`, with the same limits and exact Rust 1.85.0 toolchain selection.

Both reports are intentionally preserved even though their status is `failed`.
Their archive and generated archive SHA-256 values match. Stable recorded the
`changed-payload-accepted-as-duplicate` mutant's clean compile ending in
`SIGTERM`, then passed its restored reference check; no later stable mutant
results are recorded. MSRV stopped at the bounded deadline-mutant test signal.
A signal is not accepted as behavioral mutant evidence, so these files do not
constitute a stable/MSRV archive pass or release approval.
