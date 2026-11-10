# File schema evolution

This optional extension follows Todo I/O. It separates reading a supported file,
normalizing its meaning and explicitly upgrading it on disk. The browser
normalization exercise uses validated decoded values. The native package
`file-schema-evolution-workshop` supplies the actual codec and filesystem path.
It uses the Rust standard library, edition 2024 and MSRV 1.85.0. The existing Todo
V1 and SQLite projects retain their own contracts.

## File grammar and normalization

The examples below show the tab and line feed as `\t` and `\n`. The actual
files contain those bytes. The header and each record end in LF. A header alone
represents an empty list.

| Version | Header | Record |
| --- | --- | --- |
| V1 | `RUST_TODO_V1\n` | `STATUS\tTITLE\n` |
| V2 | `RUST_TODO_V2\tNEXT\n` | `ID\tSTATUS\tTITLE\n` |

The file is UTF-8 without a leading BOM or CR/CRLF line endings. `STATUS` is `0`
or `1`. The title needs nonempty text after trimming and may contain tabs but
no CR or LF. The parser preserves its original whitespace and Unicode. It
splits V1 rows at the first tab and V2 rows at the first two tabs. IDs and
numeric `NEXT` use canonical positive decimal `u64` values. IDs must be unique
and numeric `NEXT` must exceed every visible ID. The single `-` token represents
an exhausted allocator, including after deletion of the maximum ID.

`decode` validates bytes and returns `Decoded::Legacy` or `Decoded::Current`.
The error order starts with UTF-8, then the header and its `NEXT` token, then
final LF. A missing header line break is `InvalidHeader`. A bare canonical
header for a version of 3 or higher reports `UnsupportedVersion` before body
checks. Invalid header shapes and overflowing version numbers report
`InvalidHeader`. An invalid `NEXT` token in an otherwise shaped V2 header
reports `InvalidNextId`. Within the body, the first invalid physical row wins.
For V2, row shape, ID, status and title are checked in that order. After all
rows parse, duplicate IDs are checked in input order before comparing `NEXT`
with the stored IDs.

`normalize` assigns V1 IDs from row positions starting at 1 and sets `NEXT` to
the next unused ID. It preserves the order, completion flags and exact titles,
including duplicate records. For V2 it preserves the validated IDs, order and
stored `NEXT`. `load` composes `decode` and `normalize`. The `Loaded` value
records the input `Version` and exposes the current `Todo` through `todo` or
`into_todo`. `encode_current` serializes the current model as V2. Removing an
entry preserves survivors and the allocation cursor. Appending with
`NEXT = u64::MAX` allocates that ID once and exhausts the cursor. An invalid
title or exhausted allocation leaves the model unchanged.

## Explicit replacement

`load` and `prepare_upgrade` work on bytes without filesystem access.
`prepare_upgrade` returns `AlreadyCurrent` only after full V2 validation.
For V1, it returns a `PreparedUpgrade` containing the exact original and
replacement bytes behind private fields. `upgrade_file` reads and validates a
path before deciding whether to apply a plan. It returns a read error for a
missing file and leaves validated V2 files untouched.

`apply_prepared` consumes the plan, rereads the target and compares the exact
source bytes. A mismatch returns `SourceChanged` before creating a stage.
The stage name appends `.upgrade-tmp` to the complete target name. Exclusive
creation preserves an existing stage file, directory or symlink. The upgrade
writes and syncs the stage, closes it, then renames it over the target. Failures
clean up only the stage created by that invocation on a best-effort basis.
`UpgradeError` preserves the underlying I/O error and phase (`Read`,
`CreateStage`, `WriteStage`, `SyncStage` or `Rename`).

Successful rename is the commit point. The library performs no later I/O, and
the example can still report a stdout failure after a committed upgrade. The
byte comparison detects a change that already happened. The contract assumes
trusted paths and a single writer. It provides no compare-and-swap, parent
directory sync, power-loss durability, multiwriter transaction or general
platform and path-security guarantee. Test explicit replacement on a disposable
copy of the fixture file.

## Lessons and package evidence

`file-schema-normalization` has one primary family,
`file-schema-evolution/normalize-v1`. Apply and blank are two entry points for
that family. Ordinary review uses different data to recall the same operation
and does not add primary credit. Prior help in the family follows its aliases,
including solution exposure in ordinary review. A clean prior event remains in
history. The upgrade lesson is practice and adds no gate task. The solution
package discloses both apply and blank references through the existing exposure
tracking. The starter has no reveal references. Browser observations cover
source exposure and saved state. The native package verifies actual filesystem
behavior with authored fixtures.

Each archive contains nine authored files and four existing notices. The
starter leaves `normalize` unfinished, and the solution supplies it. The
package has no authored `Cargo.lock`. In the extracted package directory, use
the following commands with an installed Rust toolchain. Select stable or
exact 1.85.0 using your qualified local toolchain configuration.

```sh
cargo generate-lockfile --offline
cargo test --offline --locked
cargo test --offline --locked --release
cargo run --offline --locked --example upgrade -- path/to/disposable-copy.txt
```

For the planned repository verifier, use the admitted local environment with
installed tools and the fixed repository fixture inputs.

```sh
npm run content:file-schema-evolution -- --mode stable
npm run content:file-schema-evolution -- --mode msrv
```

The verifier is planned to check the generated lock remains unchanged, compare
closed archive contents, run named positive and equivalent cases in both
profiles, and classify semantic rejections only after successful compilation.
Three external-client probes cover private `Todo` fields, private `Entry` ID
and private `PreparedUpgrade` bytes, with accessor and deliberate visibility
relaxation controls. The app's learner runner is separate from this local
maintainer verification.

## Native verification inventory

The 14 named package tests are listed below.

- `legacy_upgrade_preserves_literal_meaning`
- `current_sparse_identity_and_history_are_preserved`
- `load_and_prepare_never_rewrite`
- `future_and_corrupt_files_are_read_only`
- `current_upgrade_is_validated_noop`
- `explicit_upgrade_writes_exact_current_bytes`
- `prepared_source_change_refuses_before_stage`
- `stage_collision_preserves_both_files`
- `upgrade::tests::rename_error_cleans_owned_stage`
- `missing_source_is_not_created`
- `delete_then_append_does_not_reuse_identity`
- `max_identifier_allocates_once_then_refuses_atomically`
- `malformed_order_has_stable_first_error`
- `source_error_retains_original_io_cause`

The 15 fixed semantic mutants and their targeted assertion tests are listed below.

| ID | Deliberate change | Target test |
| --- | --- | --- |
| M01 | Sort legacy rows by title | `legacy_upgrade_preserves_literal_meaning` |
| M02 | Deduplicate identical adjacent legacy rows | `legacy_upgrade_preserves_literal_meaning` |
| M03 | Trim legacy titles | `legacy_upgrade_preserves_literal_meaning` |
| M04 | Invert the legacy completion flag | `legacy_upgrade_preserves_literal_meaning` |
| M05 | Start legacy allocation at ID 2 | `legacy_upgrade_preserves_literal_meaning` |
| M06 | Renumber existing V2 entries | `current_sparse_identity_and_history_are_preserved` |
| M07 | Recompute V2 `NEXT` from visible IDs | `current_sparse_identity_and_history_are_preserved` |
| M08 | Treat an unsupported version as empty V1 | `future_and_corrupt_files_are_read_only` |
| M09 | Accept current header bytes without validating rows | `current_upgrade_is_validated_noop` |
| M10 | Replace a valid current file | `current_upgrade_is_validated_noop` |
| M11 | Skip the stale source byte comparison | `prepared_source_change_refuses_before_stage` |
| M12 | Truncate a preexisting stage instead of requiring exclusive creation | `stage_collision_preserves_both_files` |
| M13 | Reset allocation after removing the largest ID | `delete_then_append_does_not_reuse_identity` |
| M14 | Wrap allocation after `u64::MAX` | `max_identifier_allocates_once_then_refuses_atomically` |
| M15 | Advance allocation before validating an append title | `max_identifier_allocates_once_then_refuses_atomically` |

At the 10 November 2026 authoring checkpoint, the solution archive passed all
14 named tests in debug and release on stable and exact Rust 1.85.0. The stable
starter had three passing cases and 11 expected unfinished cases in each build
profile. Focused stable debug diagnostics compiled and rejected all 15 mutants
at their targeted tests, and both alternative normalizers passed all 14 tests.
The three privacy categories were exercised on both toolchains. These are
focused T1 observations. The complete verifier matrix, browser and offline
campaign, and final local qualification are pending separate evidence.

See [plan 004](../plans/004-file-schema-evolution.md) for scope and local closure
gates. Rust source and operational metadata use MIT. Original Polish teaching
prose uses CC BY 4.0 under the existing [licensing policy](licensing.md). The
archive uses the existing notice set.
