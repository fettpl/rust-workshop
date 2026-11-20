// SPDX-License-Identifier: MIT
// Authored native proof inputs. Importing this module does not run any commands.

export const fileSchemaNativeTests = [
  "legacy_upgrade_preserves_literal_meaning",
  "current_sparse_identity_and_history_are_preserved",
  "load_and_prepare_never_rewrite",
  "future_and_corrupt_files_are_read_only",
  "current_upgrade_is_validated_noop",
  "explicit_upgrade_writes_exact_current_bytes",
  "prepared_source_change_refuses_before_stage",
  "stage_collision_preserves_both_files",
  "upgrade::tests::rename_error_cleans_owned_stage",
  "missing_source_is_not_created",
  "delete_then_append_does_not_reuse_identity",
  "max_identifier_allocates_once_then_refuses_atomically",
  "malformed_order_has_stable_first_error",
  "source_error_retains_original_io_cause",
] as const;

export const fileSchemaSemanticMutations = [
  {
    id: "M01",
    sourceFile: "src/model.rs",
    before: "            let rows = into_legacy_rows(legacy);",
    after: String.raw`            let mut rows = into_legacy_rows(legacy);
            rows.sort_by(|left, right| left.1.cmp(&right.1));`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "d53b5da5cae532750115374a51a6ccd615777076e603aab6bd74662f0eabac9e",
    target: "compatibility",
    expectedTest: "legacy_upgrade_preserves_literal_meaning",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 41,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M02",
    sourceFile: "src/model.rs",
    before: "            let rows = into_legacy_rows(legacy);",
    after: String.raw`            let mut rows = into_legacy_rows(legacy);
            rows.dedup();`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "63d84ba5754c9e7670d380c62ab516f5f1c1b32fbaff42983776a6f1355d2c59",
    target: "compatibility",
    expectedTest: "legacy_upgrade_preserves_literal_meaning",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 41,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M03",
    sourceFile: "src/model.rs",
    before: "                entries.push(Entry { id, done, title });",
    after:
      "                entries.push(Entry { id, done, title: title.trim().to_owned() });",
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "83347268c6cb51f63c5dc60aaa2731e9e921a6a6bbe3b357e44ac3a5b253cba6",
    target: "compatibility",
    expectedTest: "legacy_upgrade_preserves_literal_meaning",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 19,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M04",
    sourceFile: "src/model.rs",
    before: "                entries.push(Entry { id, done, title });",
    after: "                entries.push(Entry { id, done: !done, title });",
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "f08d1ac39b0a680535049589fdd2dfb604d8c89b8c031a82e53f8da7c1e2a7c7",
    target: "compatibility",
    expectedTest: "legacy_upgrade_preserves_literal_meaning",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 19,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M05",
    sourceFile: "src/model.rs",
    before: String.raw`            for (position, (done, title)) in (1..=count).zip(rows) {
                let id = NonZeroU64::new(position).ok_or(ConversionError::TooManyLegacyRecords)?;
                entries.push(Entry { id, done, title });
            }
            let todo = Todo {
                entries,
                next_id: next_after(count),
            };`,
    after: String.raw`            let last = count.checked_add(1).ok_or(ConversionError::TooManyLegacyRecords)?;
            for (position, (done, title)) in (2..=last).zip(rows) {
                let id = NonZeroU64::new(position).ok_or(ConversionError::TooManyLegacyRecords)?;
                entries.push(Entry { id, done, title });
            }
            let todo = Todo {
                entries,
                next_id: next_after(last),
            };`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "fd2330f3e4d9a727beeb7d55dd5ce396b485359e97d9704b8da935361f59f29c",
    target: "compatibility",
    expectedTest: "legacy_upgrade_preserves_literal_meaning",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 19,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M06",
    sourceFile: "src/model.rs",
    before: String.raw`        Decoded::Current(todo) => Ok(Loaded {
            version: Version::V2,
            todo,
        }),`,
    after: String.raw`        Decoded::Current(mut todo) => {
            for (index, entry) in todo.entries.iter_mut().enumerate() {
                let position = u64::try_from(index).ok().and_then(|value| value.checked_add(1));
                entry.id = position.and_then(NonZeroU64::new).ok_or(ConversionError::TooManyLegacyRecords)?;
            }
            Ok(Loaded { version: Version::V2, todo })
        }`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "2f3798f64b2ea52f62b6e10127363358dcad6e483ae2ad1b3a31680de9c44dd2",
    target: "compatibility",
    expectedTest: "current_sparse_identity_and_history_are_preserved",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 62,
      column: 5,
      sourceLine: "assert_eq!(ids, [9, 2]);",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M07",
    sourceFile: "src/model.rs",
    before: String.raw`        Decoded::Current(todo) => Ok(Loaded {
            version: Version::V2,
            todo,
        }),`,
    after: String.raw`        Decoded::Current(mut todo) => {
            let last = todo.entries.iter().map(|entry| entry.id.get()).max().unwrap_or(0);
            todo.next_id = next_after(last);
            Ok(Loaded { version: Version::V2, todo })
        }`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "c1f5e68009ad8ccb616942b4cfe9cd63fd7c3bb74ed2e46618afa8b4e4ff3ee0",
    target: "compatibility",
    expectedTest: "current_sparse_identity_and_history_are_preserved",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 63,
      column: 5,
      sourceLine: "assert_eq!(loaded.todo().next_id(), next(12));",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M08",
    sourceFile: "src/codec.rs",
    before: "    let header = parse_header(header)?;",
    after: String.raw`    let header = match parse_header(header) {
        Err(FormatError::UnsupportedVersion(_)) => return Ok(Decoded::Legacy(legacy_from_rows(Vec::new()))),
        result => result?,
    };`,
    sourceSha256:
      "1af028b1400a250ad0fc58c4c2e2b15d67352cce9beecb6e9d13dbf2e2b00970",
    patchedSourceSha256:
      "5a9599fdbaa6576479f6d50fd33168d3c8a7ac3e458c2dce9c7b749498a9ca8c",
    target: "upgrade",
    expectedTest: "future_and_corrupt_files_are_read_only",
    assertion: {
      sourceFile: "tests/upgrade.rs",
      line: 127,
      column: 9,
      sourceLine:
        'assert_eq!(observed, Some(expected), "{bytes:?}: {result:?}");',
      sourceSha256:
        "1ce8615fb18255fcb18734a388d517316673fc6d8b95b79af1f5488cf7939f74",
    },
  },
  {
    id: "M09",
    sourceFile: "src/model.rs",
    before: "    let loaded = load(bytes)?;",
    after: String.raw`    if bytes.starts_with(b"RUST_TODO_V2\t") {
        return Ok(Preparation::AlreadyCurrent);
    }
    let loaded = load(bytes)?;`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "74e2f028a220164503c53c16e2b94fc04b59d1532dadc95af5a736df277ed0eb",
    target: "upgrade",
    expectedTest: "current_upgrade_is_validated_noop",
    assertion: {
      sourceFile: "tests/upgrade.rs",
      line: 158,
      column: 5,
      sourceLine: "assert!(matches!(",
      sourceSha256:
        "1ce8615fb18255fcb18734a388d517316673fc6d8b95b79af1f5488cf7939f74",
    },
  },
  {
    id: "M10",
    sourceFile: "src/upgrade.rs",
    before:
      "        Preparation::AlreadyCurrent => Ok(UpgradeOutcome::AlreadyCurrent),",
    after: String.raw`        Preparation::AlreadyCurrent => {
            commit(path, &bytes)?;
            Ok(UpgradeOutcome::AlreadyCurrent)
        }`,
    sourceSha256:
      "4828a58ce8871b0f4954022250ac88943ed5ea0d883063092ad9d447b664dbcb",
    patchedSourceSha256:
      "05a20a427720ae5f9907b880ff09e16722c9e2e8c2c855be882e687f998926a1",
    target: "upgrade",
    expectedTest: "current_upgrade_is_validated_noop",
    assertion: {
      sourceFile: "tests/upgrade.rs",
      line: 143,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "1ce8615fb18255fcb18734a388d517316673fc6d8b95b79af1f5488cf7939f74",
    },
  },
  {
    id: "M11",
    sourceFile: "src/upgrade.rs",
    before: String.raw`    if observed != plan.original() {
        return Err(UpgradeError::SourceChanged);
    }`,
    after: "    let _ = observed;",
    sourceSha256:
      "4828a58ce8871b0f4954022250ac88943ed5ea0d883063092ad9d447b664dbcb",
    patchedSourceSha256:
      "7fde279f79825e4d1d05b8d35b09fcf744b3ef2010ff8867531efd05f0d65f5c",
    target: "upgrade",
    expectedTest: "prepared_source_change_refuses_before_stage",
    assertion: {
      sourceFile: "tests/upgrade.rs",
      line: 196,
      column: 5,
      sourceLine:
        "assert!(matches!(result, Err(UpgradeError::SourceChanged)));",
      sourceSha256:
        "1ce8615fb18255fcb18734a388d517316673fc6d8b95b79af1f5488cf7939f74",
    },
  },
  {
    id: "M12",
    sourceFile: "src/upgrade.rs",
    before: "        .create_new(true)",
    after: String.raw`        .create(true)
        .truncate(true)`,
    sourceSha256:
      "4828a58ce8871b0f4954022250ac88943ed5ea0d883063092ad9d447b664dbcb",
    patchedSourceSha256:
      "51963ca9ef70802c49ceee2cef47b326bc505e1a46ecae0e0da8423546268239",
    target: "upgrade",
    expectedTest: "stage_collision_preserves_both_files",
    assertion: {
      sourceFile: "tests/upgrade.rs",
      line: 219,
      column: 5,
      sourceLine: "assert_eq!(",
      sourceSha256:
        "1ce8615fb18255fcb18734a388d517316673fc6d8b95b79af1f5488cf7939f74",
    },
  },
  {
    id: "M13",
    sourceFile: "src/model.rs",
    before: "        Ok(self.entries.remove(position))",
    after: String.raw`        let entry = self.entries.remove(position);
        if self.entries.iter().all(|other| other.id < id) {
            self.next_id = NextId::Available(id);
        }
        Ok(entry)`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "6e2d354c6bb51ab011139c4a2917fa136c4a4d54f79ae4127c9345107476d9aa",
    target: "compatibility",
    expectedTest: "delete_then_append_does_not_reuse_identity",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 90,
      column: 5,
      sourceLine: "assert_eq!(todo.next_id(), next(12));",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M14",
    sourceFile: "src/model.rs",
    before: "        self.next_id = next_after(id.get());",
    after: String.raw`        self.next_id = if id.get() == u64::MAX {
            NextId::Available(NonZeroU64::MIN)
        } else {
            next_after(id.get())
        };`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "83e69d3860995cddb35b1be2e6639e3e0a10b619321d17cc50c28451b47702d6",
    target: "compatibility",
    expectedTest: "max_identifier_allocates_once_then_refuses_atomically",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 115,
      column: 5,
      sourceLine: "assert_eq!(todo.next_id(), NextId::Exhausted);",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
  {
    id: "M15",
    sourceFile: "src/model.rs",
    before: String.raw`        if !valid_title(&title) {
            return Err(EditError::InvalidTitle);
        }
        let NextId::Available(id) = self.next_id else {
            return Err(EditError::Exhausted);
        };
        self.next_id = next_after(id.get());`,
    after: String.raw`        let NextId::Available(id) = self.next_id else {
            return Err(EditError::Exhausted);
        };
        self.next_id = next_after(id.get());
        if !valid_title(&title) {
            return Err(EditError::InvalidTitle);
        }`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "283c06fb3e1fe4aa83aab6a975eae501ff28c9e919dce496278b3dcf88021729",
    target: "compatibility",
    expectedTest: "max_identifier_allocates_once_then_refuses_atomically",
    assertion: {
      sourceFile: "tests/compatibility.rs",
      line: 110,
      column: 9,
      sourceLine: "assert_eq!(encode_current(&todo), source);",
      sourceSha256:
        "be6d210f5f06e635bc60f0f860413d155ef578e58b64c27a4ec545a8d7877084",
    },
  },
] as const;

export const fileSchemaCompilerProbes = [
  {
    id: "todo-private-fields",
    forbiddenSource: String.raw`use file_schema_evolution::{NextId, Todo};

fn main() {
    let _forged = Todo {
        entries: Vec::new(),
        next_id: NextId::Exhausted,
    };
}
`,
    forbiddenSha256:
      "01039f0e68b2aeb8e785e97c920a03ba7e06faaf8727e34bc4ed82662e7e7040",
    accessorSource: String.raw`use file_schema_evolution::{NextId, load};
use std::num::NonZeroU64;

fn main() {
    let loaded = load(b"RUST_TODO_V2\t1\n").unwrap();
    assert!(loaded.todo().entries().is_empty());
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::MIN));
}
`,
    accessorSha256:
      "ee7ad6c3470ede0c61baab89a826c7e37c023759dcc2fbec693f1ae58d6b8fca",
    diagnostic: {
      code: "E0451",
      symbol: "entries",
      line: 5,
      sourceLine: "entries: Vec::new(),",
    },
    relaxation: {
      sourceFile: "src/model.rs",
      before: String.raw`pub struct Todo {
    entries: Vec<Entry>,
    next_id: NextId,
}`,
      after: String.raw`pub struct Todo {
    pub entries: Vec<Entry>,
    pub next_id: NextId,
}`,
      sourceSha256:
        "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
      patchedSourceSha256:
        "2cad4269dbd4ea87b148d74becc7ff1ff43807689fbe2cd06dff5c6af55bb75a",
    },
  },
  {
    id: "entry-private-id",
    forbiddenSource: String.raw`use file_schema_evolution::load;
use std::num::NonZeroU64;

fn main() {
    let mut todo = load(b"RUST_TODO_V2\t2\n1\t0\ta\n").unwrap().into_todo();
    let mut entry = todo.remove(NonZeroU64::MIN).unwrap();
    entry.id = NonZeroU64::new(2).unwrap();
    assert_eq!(entry.id().get(), 2);
}
`,
    forbiddenSha256:
      "c0189f33b7eb354f6868cf711e807114e1c296dbf518596522b2d5fda383b300",
    accessorSource: String.raw`use file_schema_evolution::load;

fn main() {
    let loaded = load(b"RUST_TODO_V2\t2\n1\t0\ta\n").unwrap();
    assert_eq!(loaded.todo().entries()[0].id().get(), 1);
}
`,
    accessorSha256:
      "1e946186842b4f1867282e513c699889bc75f3c72b6e2311afbf6f3a1c3b36d6",
    diagnostic: {
      code: "E0616",
      symbol: "id",
      line: 7,
      sourceLine: "entry.id = NonZeroU64::new(2).unwrap();",
    },
    relaxation: {
      sourceFile: "src/model.rs",
      before: String.raw`pub struct Entry {
    id: NonZeroU64,
    done: bool,
    title: String,
}`,
      after: String.raw`pub struct Entry {
    pub id: NonZeroU64,
    done: bool,
    title: String,
}`,
      sourceSha256:
        "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
      patchedSourceSha256:
        "55613a4909edac9f48ee00bc18ad17d50469f7c1bd721333abe0711c1ec3a7c0",
    },
  },
  {
    id: "prepared-upgrade-private-bytes",
    forbiddenSource: String.raw`use file_schema_evolution::PreparedUpgrade;

fn main() {
    let _forged = PreparedUpgrade {
        original: Vec::new(),
        replacement: vec![0xff],
    };
}
`,
    forbiddenSha256:
      "6a28fb9dbe6e0f2c1c459b3095bf41c0fcf1bc32cf14e12c72c1c1365675108d",
    accessorSource: String.raw`use file_schema_evolution::{Preparation, prepare_upgrade};

fn main() {
    let bytes = b"RUST_TODO_V1\n";
    let Preparation::Upgrade(plan) = prepare_upgrade(bytes).unwrap() else { unreachable!() };
    assert_eq!(plan.original(), bytes);
    assert_eq!(plan.replacement(), b"RUST_TODO_V2\t1\n");
}
`,
    accessorSha256:
      "d38faa31739840717823da371f8fbd1c2b75ffdf6a9f78c9f64d09ec8313ac3e",
    diagnostic: {
      code: "E0451",
      symbol: "replacement",
      line: 6,
      sourceLine: "replacement: vec![0xff],",
    },
    relaxation: {
      sourceFile: "src/model.rs",
      before: String.raw`pub struct PreparedUpgrade {
    original: Vec<u8>,
    replacement: Vec<u8>,
}`,
      after: String.raw`pub struct PreparedUpgrade {
    pub original: Vec<u8>,
    pub replacement: Vec<u8>,
}`,
      sourceSha256:
        "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
      patchedSourceSha256:
        "81b3fe5d529f2c12dababe48932a25df98438961c6f34bd849e23d19384ecc5c",
    },
  },
] as const;

export const fileSchemaNativeEquivalents = [
  {
    id: "enumerated-rows",
    sourceFile: "src/model.rs",
    before: String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
    match decoded {
        Decoded::Legacy(legacy) => {
            let rows = into_legacy_rows(legacy);
            let count =
                u64::try_from(rows.len()).map_err(|_| ConversionError::TooManyLegacyRecords)?;
            let mut entries = Vec::with_capacity(rows.len());
            for (position, (done, title)) in (1..=count).zip(rows) {
                let id = NonZeroU64::new(position).ok_or(ConversionError::TooManyLegacyRecords)?;
                entries.push(Entry { id, done, title });
            }
            let todo = Todo {
                entries,
                next_id: next_after(count),
            };
            Ok(Loaded {
                version: Version::V1,
                todo,
            })
        }
        Decoded::Current(todo) => Ok(Loaded {
            version: Version::V2,
            todo,
        }),
    }
}`,
    after: String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
    let legacy = match decoded {
        Decoded::Current(todo) => return Ok(Loaded { version: Version::V2, todo }),
        Decoded::Legacy(legacy) => legacy,
    };
    let rows = into_legacy_rows(legacy);
    let count = u64::try_from(rows.len()).map_err(|_| ConversionError::TooManyLegacyRecords)?;
    let entries = rows
        .into_iter()
        .enumerate()
        .map(|(index, (done, title))| {
            let id = u64::try_from(index)
                .ok()
                .and_then(|value| value.checked_add(1))
                .and_then(NonZeroU64::new)
                .ok_or(ConversionError::TooManyLegacyRecords)?;
            Ok(Entry { id, done, title })
        })
        .collect::<Result<Vec<_>, ConversionError>>()?;
    Ok(Loaded { version: Version::V1, todo: Todo { entries, next_id: next_after(count) } })
}`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "1b97dbd0671037679f830ea7d54a06d9edb39b01f7401dfc9946b2026f7d5d5b",
  },
  {
    id: "checked-cursor",
    sourceFile: "src/model.rs",
    before: String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
    match decoded {
        Decoded::Legacy(legacy) => {
            let rows = into_legacy_rows(legacy);
            let count =
                u64::try_from(rows.len()).map_err(|_| ConversionError::TooManyLegacyRecords)?;
            let mut entries = Vec::with_capacity(rows.len());
            for (position, (done, title)) in (1..=count).zip(rows) {
                let id = NonZeroU64::new(position).ok_or(ConversionError::TooManyLegacyRecords)?;
                entries.push(Entry { id, done, title });
            }
            let todo = Todo {
                entries,
                next_id: next_after(count),
            };
            Ok(Loaded {
                version: Version::V1,
                todo,
            })
        }
        Decoded::Current(todo) => Ok(Loaded {
            version: Version::V2,
            todo,
        }),
    }
}`,
    after: String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
    match decoded {
        Decoded::Legacy(legacy) => {
            let mut cursor = Some(NonZeroU64::MIN);
            let mut entries = Vec::new();
            for (done, title) in into_legacy_rows(legacy) {
                let id = cursor.ok_or(ConversionError::TooManyLegacyRecords)?;
                entries.push(Entry { id, done, title });
                cursor = id.get().checked_add(1).and_then(NonZeroU64::new);
            }
            let next_id = cursor.map_or(NextId::Exhausted, NextId::Available);
            Ok(Loaded { version: Version::V1, todo: Todo { entries, next_id } })
        }
        Decoded::Current(todo) => Ok(Loaded { version: Version::V2, todo }),
    }
}`,
    sourceSha256:
      "ff0e4ccfdafaec603b9df21835729056748926d54f1cf823ec778e87ec7ecf8f",
    patchedSourceSha256:
      "ad2c2f57b70745a95a3b758956155b427724e6ca97785e2fbfcd3de9c4e80174",
  },
] as const;
