# Plan 004: Preserve file meaning across explicit schema upgrades

Registered on 2026-11-10. Implementation and local qualification are pending. The accepted post-maintenance baseline is commit `205c988ca9ef308d06fc00583481ae27a10e98fe`, tree `3ff20f5805520f19d9d021e2c4672d756611f578`, with 657 tracked source files. Registry, learner state and archive observations were captured before authoring. Implementation and verification below describe the work to be done.

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
