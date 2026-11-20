# MutSlot scoped callback transfer

The existing `unsafe-miri-mut-slot` lesson retains its eight historical steps. It appends `mut-slot-with-mut-model` (exposure only) and `mut-slot-with-mut-transfer`, a primary in the distinct family `unsafe-miri/mut-slot-with-mut-v1`. An optional stop after the historical recall separates the new callback model and task. A narrowly identified ten-step exception requires that boundary and both appended IDs; the general five-to-nine-step guard stays unchanged. The old gate/blank family remains `unsafe-miri/mut-slot-v1`; the concept's two-family calibration and the module criterion's one-task requirement are unchanged.

## Contract

The supplied safe wrapper exposes `with_mut<R, F>(&mut self, f: F) -> R` with `F: for<'short> FnOnce(&'short mut T) -> R`. One call gives the callback a fresh mutable reborrow, calls it exactly once and returns its result. The parent wrapper can be used again after that temporary loan ends.

The result type is independent of the callback's temporary loan. It can own data or borrow a separate sufficiently long-lived owner, including an appropriate shared reference carried inside `T`. It is not necessarily owned or `'static`. Shortening the outer access does not change the invariant `T` or permit storing a shorter reference where `T` requires a longer one. Ordinary callback unwinding propagates; mutations made before a panic may remain. There is no rollback promise.

The appended model supplies a short HRTB bridge to the existing “Callback odwiedza lokalne pożyczki” lesson. [Higher-ranked bounds](https://doc.rust-lang.org/reference/trait-bounds.html#higher-ranked-trait-bounds), [subtyping and variance](https://doc.rust-lang.org/reference/subtyping.html), and [FnOnce](https://doc.rust-lang.org/std/ops/trait.FnOnce.html) describe the language contract; links do not replace executable witnesses.

## Authored proof boundary

Canonical and equivalent safe implementations use the same behavior harness. Compiler clients distinguish a genuine `FnOnce`, local captures, unrelated or carried borrowed results and minimal generic bounds from surplus restrictions. Matched positive and diagnostic-only negative clients exercise escaping callback loans and invariant inner reference lifetimes. The memory-safe TODO starter and semantic controls must reject for their named behavior, not missing tools, imports or timeouts.

The Miri Safety archive adds the standalone safe target `tests/mut_slot_with_mut.rs` in starter and solution variants, containing the actual teaching implementation and harness. It does not expand the pre-existing library API. The old `src/lib.rs`, `tests/safety_contract.rs`, Cargo unsafe denial and authored UB-negative files stay unchanged. This new target needs no unsafe allowance. Stable, exact MSRV and pinned Miri receipts describe this positive target only, not a new acceptance of every historical Miri fixture.

The new predecessor projection is closed over the exact reviewed project successor before removing only this target and its reveal reference. The lesson projection also removes only the declared new stop and steps; unexpected stop changes remain visible. It restores the authentic post-Slot project, then composes the older Slot and earlier adapters. Historical receipts and expected hashes are immutable. Near-miss project changes and changes to old steps remain visible.

## Learning and verification limits

Exposure, assistance, reveal, downloads, aliases and recall cannot create a second primary family. Saved raw history, drafts, notes, help, bookmarks and exact resume remain preserved; the new task does not retroactively earn credit. Production browser and warmed-offline tests establish the declared UI/state contracts, including the actual editor, keyboard and narrow viewport. Controlled runner responses are not compiler correctness or learner attainment.

Maintainer native checks execute only fixed authored trusted fixtures. Learner/imported code remains behind the isolated remote runner. No authored UB-negative or arbitrary learner code is executed natively. Actual retained reports must name source, selected tools, commands, failures, skips and bounded results. Local software acceptance is separate from exact-head hosted CI, ordinary integration, public release and observed learning.
