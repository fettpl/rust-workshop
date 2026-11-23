# Macros as APIs: bounded course milestone

[Polski](2026-09-25-macros-as-api-design.pl.md)

Date: 2026-09-25. Design owner: GPT-6-Astra medium (planning and qualitative review only).

## Intent and scope

The learner knows basic programming and has reached the later Rust modules. Existing course examples use macros, but there is no dedicated authored path for defining a `macro_rules!` macro or preserving its behavior for another crate. Add one Polish, late-course module with three lessons (about 18–20 minutes each): (1) expression capture and exactly-once evaluation, (2) repetition grammar including empty input and optional trailing separator, and (3) exported macro resolution, `$crate`, and the Rust 2024 `expr` fragment. Each concept has prediction, runnable/observable example, explanation, code gate, a distinct blank-page transfer, debug observation, and delayed retrieval. The module is a bounded declarative-macro milestone, not a procedural-macro implementation or a promise of complete metaprogramming coverage.

The new module should be independently useful while remaining honest about evidence. Browser exercises run one Rust source file and can prove only that source's behavior. A separate trusted Cargo fixture must compile and test a library with an exported macro from a different client crate. No learner code, imported archive, remote registry, or live network is passed to the local verifier. Existing project archives and progress IDs stay byte-for-byte stable.

## External contract to teach and verify

Use a fresh domain such as metric readings, distinct from current public-API and property exercises. The authored library exports a `macro_rules!` expression macro that builds ordered readings from `name => value` pairs. The macro accepts zero entries and an optional trailing comma, evaluates each supplied expression exactly once in input order, and uses `$crate::Reading` (or a public constructor path) so an external client does not need that type in scope. Its `:expr` matcher is defined in a 2024-edition crate and accepts `const { ... }`. The external client intentionally defines an unrelated local `Reading` to reveal unqualified-path mistakes. No type or value from the user's crate should be captured accidentally. The source should make the public helper's visibility explicit; `$crate` does not bypass privacy.

The verifier runs a std-only two-crate Cargo workspace with edition 2024, resolver 3, and declared Rust 1.85.0. It executes `cargo check/test --offline --locked` under stable and exact Rust 1.85.0 and saves a bounded JSON report with fixture hashes, toolchain identity, commands, exit status, and mutant outcomes. Required controlled mutants: remove `$crate` qualification (external compile failure), evaluate a supplied expression twice (behavior test failure), reject the empty/trailing-comma grammar (external compile failure), and replace `:expr` with `:expr_2021` (2024 `const` invocation compile failure). The validator must reject missing, stale, fabricated, duplicate, or infrastructure-only evidence as proof of success. Timeouts and missing toolchains are infrastructure failures, not product failures or mutant rejections.

## Course integration and user experience

Register the new module, concepts, competencies, source metadata, lesson and review steps in the catalog after relevant existing testing/public-API lessons. Do not change existing IDs or storage migrations. Each criterion uses a primary code gate OR a genuinely independent blank-page gate; revealing a primary solution must not grant independent mastery. Explicitly separate browser model evidence from the trusted external-crate verifier in learner copy. Use official Rust Book, Reference, and Rust 2024 Edition Guide sources with reviewed date and recheck policy. Keep learner copy Polish and README, commit messages and PR text English. The audience needs basic programming knowledge; the course teaches Rust from zero.

Targeted production Playwright and offline checks cover navigation, all three criteria, reveal weakening, independent blank evidence, exact draft/note resume, mobile keyboard, accessibility and console errors. The mocked runner may return success only for the exact authored solution with its matching evaluator tests; any unexpected code receives schema-valid failure. Offline checks demonstrate persistence and the unavailable-compiler boundary rather than claiming a Cargo run.

## Delivery and integration

Start from PR #26 head `d0210272c38ca13699621d412f085662fff4ec2c` in isolated worktrees so this milestone stacks cleanly on the API Release Matrix while GitHub Actions remains account-blocked. Keep the new module, verifier, E2E, and docs as reviewable commits. Run focused and full local checks, stable/MSRV fixture verification, production E2E and offline smoke. Push a new remote branch and create a draft PR targeting PR #26's branch; do not merge until exact-head GitHub Actions runs green after the expected billing recovery on 2026-10-01. A draft PR and local evidence do not imply a completed course or production-ready macro API.

## Review focus

1. Side-effectful arguments are evaluated once and in order; a green pure-value example is insufficient.
2. Empty input, a single entry, multiple entries and trailing comma follow the documented grammar; malformed syntax fails at compile time.
3. External client shadowing does not alter the library's `$crate` path; public visibility is actually sufficient.
4. The 2024 `:expr` versus `:expr_2021` case runs under exact Rust 1.85.0; stable alone is not MSRV proof.
5. A compiler failure in a positive scenario, timeout, or omitted command cannot be counted as a passing contract or a rejected mutant.

## Primary technical sources

- https://doc.rust-lang.org/book/ch20-05-macros.html
- https://doc.rust-lang.org/reference/macros-by-example.html
- https://doc.rust-lang.org/edition-guide/rust-2024/macro-fragment-specifiers.html
