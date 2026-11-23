# Plan 004: Preserve file meaning across explicit schema upgrades

[Polski](004-file-schema-evolution.pl.md)

Registered on 2026-11-10. The scope below preserves the original implementation plan. The accepted post-maintenance baseline is commit `205c988ca9ef308d06fc00583481ae27a10e98fe`, tree `3ff20f5805520f19d9d021e2c4672d756611f578`, with 657 tracked source files. Registry, learner state and archive observations were captured before authoring. Implementation and verification below describe the work to be done.

## Workshop scope

Add one optional Rust extension with two lessons, 12 steps, one concept, one competency, one coding task family and one project. The first lesson assesses normalization. Its apply and blank exercises count as the same task, and ordinary review recalls that family without granting new primary credit. The second lesson rehearses explicit file upgrades as practice. Browser exercises use validated decoded values, and native tests check the codec and filesystem. Learner text is Polish and engineering docs are English. Omit duration metadata on both new lessons.

Preserve the Core17 route and its predecessor content, lesson duration metadata, learner history, assistance flags and independent credit. Keep the review-family assistance fix in effect for counted course gates. The planned catalog has 51 modules, 204 lessons, 1,359 lesson steps, 199 concepts, 200 competencies, 349 sources and 16 projects. Confirm these counts against the resulting course and preserve the 30 predecessor archives byte for byte.

## File contract

Use a separate standard-library Rust package with edition 2024 and MSRV 1.85.0. Decode the existing Todo V1 bytes as legacy data. Assign stable IDs in original row order and preserve status, exact titles and duplicates. V2 carries record IDs and the next allocation value or an exhausted marker. Preserve sparse IDs, row order and allocation history, including after deletion. Reject malformed and unsupported inputs without rewriting them. Loading and preparing an upgrade are pure byte operations.

An explicit upgrade validates the source, checks that its bytes still match the prepared input, then exclusively creates a sibling staging file, writes and syncs it, closes it and renames it over the original. A valid current file stays untouched. A stage collision preserves the existing stage and the original file. If a staging or rename operation fails, report the primary error and attempt cleanup only for the staging file this invocation created. Successful rename is the commit point. Later reporting can fail after the file has changed. The workshop assumes trusted paths and a single writer. It makes no claim of power-loss durability, multiwriter atomicity or path security.

## Implementation and local qualification

- Implement the model, codec and upgrade package against independent literal byte and tuple oracles. Exercise malformed and future headers, duplicates, sparse and exhausted allocation, stale prepared bytes and staging collisions.
- Bind the native verifier to the authored fixtures and qualified installed tools. Generate the new package lockfile offline in the owned verification root before locked commands. Check stable and exact MSRV in debug and release, equivalent implementations, named semantic failures after compilation, and external privacy probes. Verify both new archives and the unchanged 30 predecessors.
- Integrate the lessons, shared-family evidence and historical projections. Check actual browser source exposure, package downloads, resume and offline state. Qualify native behavior separately from browser UI and state checks.
- After focused regressions, run fresh static, full unit, authored Rust corpus, native package, production browser and formal offline checks on the frozen source. Independent review and complete local history recovery are required before closing the plan. Publication, deployment, hosted Actions and remote or main integration remain outside this local milestone.

## Local qualification and acceptance | 11 November 2026

The two-lesson workshop was committed locally as `e4abd021b1ff9918e6a2cb2a9d6f0eaabde0b830`, exact
feature tree `f8a6a7c25bbce985f55bb5591f7dbe19a21d5d21`. The final catalog
contains 51 modules, 204 lessons, 1,359 steps, 199 concepts, 200 competencies,
349 sources and 16 projects. Genuine before-and-after observations preserved
all 15 predecessor registry values, the 202 earlier lessons and their duration
presence, and four representative state migration/import/export round trips.
All 30 predecessor ZIPs and their members matched on the feature tree. Both
new archives contain 13 members. Independent review and a separate restoration
of the full source-history bundle verified the feature snapshot.

Fresh qualification on the feature tree covered seven static checks,
1,989 Vitest tests without skips, the maintained native proof and its
12 recorder controls and nine comparisons, and all 2,651 authored Rust cases
on stable and exact Rust 1.85.0. The unit run recorded 33 new file-schema model
variants. Dedicated native checks for file schema evolution, typed authorization
and retry passed on both compilers. The file schema verifier exercised both
archives, offline lock generation, debug and release modes, semantic rejection
and privacy controls with separate scratch and target directories.

The production build passed 206 local browser cases without skips or retries
and passed formal offline verification with no page errors. Two external
runner smoke cases were outside this local cohort. An earlier run recorded
six timeouts overlapping host sleep and one keyboard failure. The complete
same-build rerun passed those cases. Browser responses exercised UI and state;
the native Rust fixtures supplied the filesystem evidence.

The generic package check on the feature tree found one inherited rustfmt
failure in two Rust files from the older retry starter. Its A12 package
commands passed, including both generated lockfiles and the expected unfinished
starter test result. The separately reviewed formatting commit `4ac06aa399ac1e444eecb8533f989f45feeb0327`
changed just those two members in the old starter ZIP. The other 31 archives
remained byte-identical. The formatting commit also preserves the original
historical project fingerprints in tests. The retry formatting check passed on both profiles. The full stable generic
run passed. The exact Rust 1.85.0 run exposed two other inherited Clippy
failures in the unchanged Miri Safety and typed authorization solutions.

The separately reviewed MSRV correction `3520b34dcbd32cf7b5f1651d397d59844bd446d2` elides one redundant
receiver lifetime in one member of each solution ZIP. The other 30 archives
matched. The source keeps the learner-facing lessons and historical
fingerprints. Dedicated authorization probes retained the receiver-borrow
contract. Fresh generic verification on this tree passed on stable and exact
Rust 1.85.0 with 114 accepted top-level commands per profile. All 166 focused
checks, four affected production browser scenarios and formal offline
verification passed. The complete 206-case browser run and both full Rust
corpora remain attributed to the A12 feature tree.

This record describes local checks at the cited feature and formatting trees.
Hosted Actions, external runner smokes, remote integration, deployment and
publication have separate acceptance gates.
