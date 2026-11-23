# Ownership foundation transfer contracts

[Polski](ownership-foundation-transfer-evidence.pl.md)

The `ownership-foundation-transfer` lesson is appended after the complete
historical Data Modeling sequence, including nested patterns. Its six steps
join a supplementary prediction with five primary coding contracts. Existing
lesson and step identities, Core17 navigation, module criteria and the global
two-family policy remain unchanged.

| Concept | Added primary family | Authored families after this change |
| --- | --- | --- |
| `ownership-repair` | `ownership/restore-after-rejection-v1` | 2 |
| `scope-drop` | `ownership/nested-drop-timeline-v1`, `ownership/conditional-drop-return-v1` | 2 |
| `copy-semantics` | `ownership/copy-counter-v1`, `ownership/copy-array-snapshot-v1` | 2 |
| `stack-heap` | None; remains conceptual | 0 |

Availability is not earned evidence. Exposure, imported records, hints,
reveals, repeated aliases and downloads do not create independent coding
credit. Historical events keep their IDs, timestamps and assistance history;
this addition does not manufacture delayed retrieval or learner outcomes.

## Concrete contracts

`accept_label(&mut Option<String>, bool) -> Result<(), &'static str>` keeps
`None` unchanged and returns `Err("missing")`. A rejected present value returns
`Err("rejected")` and preserves the exact original string, including empty,
Unicode and whitespace values. Acceptance returns `Ok(())` and prefixes the
current value with exactly `accepted:`. Repeated calls use the current slot.
Both take-and-restore and correct in-place implementations are valid; source
spelling, cloning and allocation choices are not grading requirements.

The Drop tasks receive a supplied safe `support::DropLog` and
`support::Marker::new(label, log)`. The log exposes a read-only count and owned
event snapshots; only the trusted marker implementation records its Drop.
Learners use concrete owned values and scopes, without implementing `Drop`,
interior mutability or generic machinery. A fresh nested-scope call returns
checkpoints `(1, 2)` and leaves events `["inner", "outer"]`. The conditional
call returns `Err("failed")` with only the outer event on failure, or `Ok(2)`
with inner-then-outer events on success. Correct implicit cleanup and other
observationally equivalent implementations are accepted.

`bump_and_keep(u32) -> (u32, u32)` returns the original value and a saturating
increment, including `u32::MAX`. `flip_first([bool; 3])` returns the unchanged
snapshot and a second array with only its first element flipped; all eight
inputs are part of the contract. These are concrete Copy observations, not
claims about physical stack/heap placement or deep cloning.

The supplied model introduces the narrow `Ok(())`/`Err(...)` convention and
opaque marker API used here. It does not provide complete implementations of
the five primary functions.

## Compatibility and session boundaries

The newest projection removes only the new lesson/ID and exact declared
optional stops before composing the existing MutSlot and older projections.
The baseline was captured before authoring; historical expected snapshots
are not regenerated from the successor. Near-miss changes to old content
remain detectable. Saved drafts, notes, bookmarks, help, raw V1/V2/V3 history
and exact old/new resume positions remain covered by the state contracts.

| Existing Cargo lesson | Optional stop after |
| --- | --- |
| `module-tree-paths` | `paths-transfer` |
| `module-visibility` | `visibility-transfer` |
| `imports-and-reexports` | `imports-transfer` |
| `cargo-package-integration` | `cargo-modify`, before `cargo-blank` |

The new lesson also offers a stop after ownership restoration, before Drop
and Copy. The duration is an estimate; no completion-time study is claimed.

## Verification boundary

Maintainer tests compile only fixed repository-authored fixtures. Canonical
and valid alternate implementations must pass; starters and compiling
semantic mutants must fail their named contract checks. Compiler witnesses
for E0382, E0515 and E0040 remain separate from behavioral evidence and have
matched positive clients. No authored undefined-behavior fixture or arbitrary
learner/imported program is executed natively.

The new native tests select only `stable` (default) or exact `1.85.0` through
`RUST_WORKSHOP_FOUNDATION_TOOLCHAIN`, invoking the fixed Rustup toolchain.
The ordinary unit job uses stable; the existing MSRV job explicitly runs both
new fixture suites on 1.85.0. Missing tools and infrastructure failures remain
failures, rather than semantic rejection or a convenient skip. A full native
recorder proof still requires the qualification inputs documented in
[initialized-prefix evidence](initialized-prefix-evidence.md).

Browser and warmed-offline checks cover the actual editor, assistance,
notes/drafts, exact resume, optional stops, keyboard access and narrow layout.
Controlled runner responses establish UI/state behavior, while compiler
fixtures establish only their declared Rust contracts. Local qualification,
hosted PR/main CI, integration, publication and observed learner performance
remain separate evidence.
