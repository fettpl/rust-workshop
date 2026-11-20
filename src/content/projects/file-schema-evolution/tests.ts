// SPDX-License-Identifier: MIT

export const compatibilityTests = String.raw`use file_schema_evolution::{
    EditError, FormatError, NextId, Version, decode, encode_current, load,
};
use std::num::NonZeroU64;

fn next(id: u64) -> NextId {
    NextId::Available(NonZeroU64::new(id).unwrap())
}

#[test]
fn legacy_upgrade_preserves_literal_meaning() {
    let loaded = load(b"RUST_TODO_V1\n0\t  plan\tA  \n1\tdup\n0\tdup\n").unwrap();
    let actual: Vec<_> = loaded
        .todo()
        .entries()
        .iter()
        .map(|entry| (entry.id().get(), entry.done(), entry.title()))
        .collect();
    assert_eq!(
        actual,
        [
            (1, false, "  plan\tA  "),
            (2, true, "dup"),
            (3, false, "dup")
        ]
    );
    assert_eq!(loaded.todo().next_id(), next(4));
    assert_eq!(loaded.version(), Version::V1);
    assert_eq!(
        encode_current(loaded.todo()),
        b"RUST_TODO_V2\t4\n1\t0\t  plan\tA  \n2\t1\tdup\n3\t0\tdup\n",
    );

    let loaded = load(b"RUST_TODO_V1\n0\tzeta\n1\talpha\n1\talpha\n").unwrap();
    let actual: Vec<_> = loaded
        .todo()
        .entries()
        .iter()
        .map(|entry| (entry.id().get(), entry.done(), entry.title()))
        .collect();
    assert_eq!(
        actual,
        [(1, false, "zeta"), (2, true, "alpha"), (3, true, "alpha")]
    );
    assert_eq!(loaded.todo().next_id(), next(4));
    assert_eq!(
        encode_current(loaded.todo()),
        b"RUST_TODO_V2\t4\n1\t0\tzeta\n2\t1\talpha\n3\t1\talpha\n",
    );
}

#[test]
fn current_sparse_identity_and_history_are_preserved() {
    let source = b"RUST_TODO_V2\t12\n9\t0\ta\n2\t1\tb\n";
    let loaded = load(source).unwrap();
    let ids: Vec<_> = loaded
        .todo()
        .entries()
        .iter()
        .map(|entry| entry.id().get())
        .collect();
    assert_eq!(ids, [9, 2]);
    assert_eq!(loaded.todo().next_id(), next(12));
    assert_eq!(loaded.version(), Version::V2);
    assert_eq!(encode_current(loaded.todo()), source);

    for source in [
        b"RUST_TODO_V2\t-\n2\t1\ta\n".as_slice(),
        b"RUST_TODO_V2\t-\n".as_slice(),
    ] {
        let loaded = load(source).unwrap();
        assert_eq!(loaded.todo().next_id(), NextId::Exhausted);
        assert_eq!(encode_current(loaded.todo()), source);
    }
}

#[test]
fn delete_then_append_does_not_reuse_identity() {
    let source = b"RUST_TODO_V2\t12\n9\t0\tdup\n2\t1\tdup\n";
    let mut todo = load(source).unwrap().into_todo();
    let absent = NonZeroU64::new(8).unwrap();
    assert_eq!(todo.remove(absent), Err(EditError::NotFound));
    assert_eq!(encode_current(&todo), source);

    let removed = todo.remove(NonZeroU64::new(9).unwrap()).unwrap();
    assert_eq!(
        (removed.id().get(), removed.done(), removed.title()),
        (9, false, "dup")
    );
    assert_eq!(todo.next_id(), next(12));
    assert_eq!(
        todo.append("dup".to_owned(), false),
        Ok(NonZeroU64::new(12).unwrap())
    );
    assert_eq!(
        encode_current(&todo),
        b"RUST_TODO_V2\t13\n2\t1\tdup\n12\t0\tdup\n"
    );
}

#[test]
fn max_identifier_allocates_once_then_refuses_atomically() {
    let source = b"RUST_TODO_V2\t18446744073709551615\n2\t1\told\n";
    let mut todo = load(source).unwrap().into_todo();
    for title in [" \t ", "bad\rtitle", "bad\ntitle"] {
        assert_eq!(
            todo.append(title.to_owned(), false),
            Err(EditError::InvalidTitle)
        );
        assert_eq!(encode_current(&todo), source);
    }

    let maximum = NonZeroU64::new(u64::MAX).unwrap();
    assert_eq!(todo.append("new".to_owned(), false), Ok(maximum));
    assert_eq!(todo.next_id(), NextId::Exhausted);
    let exhausted = b"RUST_TODO_V2\t-\n2\t1\told\n18446744073709551615\t0\tnew\n";
    assert_eq!(encode_current(&todo), exhausted);
    assert_eq!(
        todo.append("later".to_owned(), true),
        Err(EditError::Exhausted)
    );
    assert_eq!(
        todo.append(" ".to_owned(), true),
        Err(EditError::InvalidTitle)
    );
    assert_eq!(encode_current(&todo), exhausted);
    assert_eq!(todo.remove(maximum).unwrap().id(), maximum);
    assert_eq!(encode_current(&todo), b"RUST_TODO_V2\t-\n2\t1\told\n");
}

#[test]
fn malformed_order_has_stable_first_error() {
    use FormatError::*;
    let cases: &[(&[u8], FormatError)] = &[
        (
            b"RUST_TODO_V2\t3\n1\t0\ta\n1\t1\tb\n2\tx\tc\n",
            InvalidStatus { line: 4 },
        ),
        (
            b"RUST_TODO_V2\t1\n2\t0\ta\n2\t1\tb\n",
            DuplicateId { line: 3, id: 2 },
        ),
        (b"RUST_TODO_V2\t3\n0\tx\t \n", InvalidId { line: 2 }),
        (b"RUST_TODO_V2\t0\n1\t0\ta", InvalidNextId),
        (b"RUST_TODO_V2\t3\n1\t0\ta", MissingFinalNewline),
        (b"RUST_TODO_V1", InvalidHeader),
        (b"RUST_TODO_V2\t1", InvalidHeader),
        (b"RUST_TODO_V3\t1\n", InvalidHeader),
        (b"RUST_TODO_V3\ncorrupt", UnsupportedVersion(3)),
        (
            b"RUST_TODO_V18446744073709551615\n",
            UnsupportedVersion(u64::MAX),
        ),
        (b"RUST_TODO_V3\n\xff", InvalidUtf8),
        (b"\xef\xbb\xbfRUST_TODO_V1\n", InvalidHeader),
        (b"RUST_TODO_V1\r\n", InvalidHeader),
        (b"RUST_TODO_V2\t0\r\n", InvalidHeader),
        (b"RUST_TODO_V01\n", InvalidHeader),
        (b"RUST_TODO_V18446744073709551616\n", InvalidHeader),
        (b"RUST_TODO_V0\n", InvalidHeader),
        (b"RUST_TODO_V2\t1\textra\n", InvalidHeader),
        (b"RUST_TODO_V2\n", InvalidHeader),
        (b"RUST_TODO_V2\t01\n", InvalidNextId),
        (b"RUST_TODO_V2\t+1\n", InvalidNextId),
        (b"RUST_TODO_V2\t 1\n", InvalidNextId),
        (b"RUST_TODO_V2\t18446744073709551616\n", InvalidNextId),
        (b"RUST_TODO_V2\t2\n+1\t0\ta\n", InvalidId { line: 2 }),
        (b"RUST_TODO_V2\t2\n01\t0\ta\n", InvalidId { line: 2 }),
        (
            b"RUST_TODO_V2\t2\n18446744073709551616\t0\ta\n",
            InvalidId { line: 2 },
        ),
        (b"RUST_TODO_V2\t2\n2\t0\ta\n", InvalidNextId),
        (b"RUST_TODO_V2\t2\n1\t0\n", InvalidRow { line: 2 }),
        (b"RUST_TODO_V1\n\n", InvalidRow { line: 2 }),
        (b"RUST_TODO_V1\n0\tx\r\n", InvalidTitle { line: 2 }),
        (
            "RUST_TODO_V1\n1\t\u{2003}\n".as_bytes(),
            InvalidTitle { line: 2 },
        ),
    ];
    for (bytes, expected) in cases {
        assert_eq!(decode(bytes).as_ref().err(), Some(expected), "{bytes:?}");
    }
    let legacy = load(b"RUST_TODO_V1\n").unwrap();
    assert_eq!(encode_current(legacy.todo()), b"RUST_TODO_V2\t1\n");
    let unicode = "RUST_TODO_V2\t2\n1\t1\t  zażółć\tświat  \n";
    assert_eq!(
        encode_current(load(unicode.as_bytes()).unwrap().todo()),
        unicode.as_bytes()
    );
}
`;

export const upgradeTests = String.raw`use file_schema_evolution::{
    FormatError, LoadError, Preparation, UpgradeError, UpgradeOutcome, UpgradePhase,
    apply_prepared, load, prepare_upgrade, upgrade_file,
};
use std::{
    error::Error,
    ffi::OsString,
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::atomic::{AtomicUsize, Ordering},
};

const LEGACY: &[u8] = b"RUST_TODO_V1\n0\t  plan\tA  \n1\tdup\n0\tdup\n";
const CURRENT: &[u8] = b"RUST_TODO_V2\t4\n1\t0\t  plan\tA  \n2\t1\tdup\n3\t0\tdup\n";
const STAGE_SENTINEL: &[u8] = b"independent stage sentinel";

struct Fixture(PathBuf);

impl Fixture {
    fn new() -> Self {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        loop {
            let directory = std::env::temp_dir().join(format!(
                "file-schema-upgrade-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            match fs::create_dir(&directory) {
                Ok(()) => return Self(directory),
                Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
                Err(error) => panic!("could not create owned test directory: {error}"),
            }
        }
    }

    fn target(&self) -> PathBuf {
        self.0.join("todo.txt")
    }

    fn stage(&self) -> PathBuf {
        self.0.join("todo.txt.upgrade-tmp")
    }

    fn names(&self) -> Vec<OsString> {
        let mut names: Vec<_> = fs::read_dir(&self.0)
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect();
        names.sort();
        names
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn upgrade_plan(bytes: &[u8]) -> file_schema_evolution::PreparedUpgrade {
    match prepare_upgrade(bytes).unwrap() {
        Preparation::Upgrade(plan) => plan,
        Preparation::AlreadyCurrent => panic!("expected a legacy upgrade plan"),
    }
}

fn io_phase(result: &Result<UpgradeOutcome, UpgradeError>) -> Option<UpgradePhase> {
    match result {
        Err(UpgradeError::Io { phase, .. }) => Some(*phase),
        _ => None,
    }
}

fn assert_file(path: &Path, bytes: &[u8]) {
    assert_eq!(fs::read(path).unwrap(), bytes);
}

#[test]
fn load_and_prepare_never_rewrite() {
    let fixture = Fixture::new();
    let target = fixture.target();
    fs::write(&target, LEGACY).unwrap();
    let before = fixture.names();
    let bytes = fs::read(&target).unwrap();
    let load_bytes: fn(&[u8]) -> Result<file_schema_evolution::Loaded, LoadError> = load;
    let prepare_bytes: fn(&[u8]) -> Result<Preparation, LoadError> = prepare_upgrade;
    let loaded = load_bytes(&bytes).unwrap();
    let prepared = prepare_bytes(&bytes).unwrap();
    assert_eq!(loaded.version(), file_schema_evolution::Version::V1);
    assert!(matches!(prepared, Preparation::Upgrade(ref plan)
        if plan.original() == LEGACY && plan.replacement() == CURRENT));
    assert_file(&target, LEGACY);
    assert_eq!(fixture.names(), before);
}

#[test]
fn future_and_corrupt_files_are_read_only() {
    let fixture = Fixture::new();
    let target = fixture.target();
    let cases: &[(&[u8], FormatError)] = &[
        (b"RUST_TODO_V3\ncorrupt", FormatError::UnsupportedVersion(3)),
        (b"RUST_TODO_V1\n\xff", FormatError::InvalidUtf8),
        (
            b"RUST_TODO_V1\nx\ta\n",
            FormatError::InvalidStatus { line: 2 },
        ),
        (
            b"RUST_TODO_V2\t4\n0\t1\ta\n",
            FormatError::InvalidId { line: 2 },
        ),
        (
            b"RUST_TODO_V2\t4\n1\t0\ta\n1\t1\tb\n",
            FormatError::DuplicateId { line: 3, id: 1 },
        ),
        (b"RUST_TODO_V2\t2\n2\t0\ta\n", FormatError::InvalidNextId),
        (b"RUST_TODO_V1\n1\ta", FormatError::MissingFinalNewline),
    ];
    for (bytes, expected) in cases {
        fs::write(&target, bytes).unwrap();
        let before = fixture.names();
        let result = upgrade_file(&target);
        let observed = match &result {
            Err(UpgradeError::Load(LoadError::Format(error))) => Some(error),
            _ => None,
        };
        assert_eq!(observed, Some(expected), "{bytes:?}: {result:?}");
        assert_file(&target, bytes);
        assert_eq!(fixture.names(), before);
    }
}

#[test]
fn current_upgrade_is_validated_noop() {
    let fixture = Fixture::new();
    let target = fixture.target();
    let stage = fixture.stage();
    fs::write(&target, CURRENT).unwrap();
    fs::write(&stage, STAGE_SENTINEL).unwrap();
    let before = fixture.names();
    let modified = fs::metadata(&target).unwrap().modified().ok();
    let result = upgrade_file(&target);
    assert_eq!(
        result.as_ref().ok(),
        Some(&UpgradeOutcome::AlreadyCurrent),
        "{result:?}"
    );
    assert_file(&target, CURRENT);
    assert_file(&stage, STAGE_SENTINEL);
    assert_eq!(fixture.names(), before);
    if let Some(modified) = modified {
        assert_eq!(fs::metadata(&target).unwrap().modified().unwrap(), modified);
    }

    let corrupt = b"RUST_TODO_V2\t4\n0\t0\tbad\n";
    fs::write(&target, corrupt).unwrap();
    let result = upgrade_file(&target);
    assert!(matches!(
        result,
        Err(UpgradeError::Load(LoadError::Format(
            FormatError::InvalidId { line: 2 }
        )))
    ));
    assert_file(&target, corrupt);
    assert_file(&stage, STAGE_SENTINEL);
    assert_eq!(fixture.names(), before);
}

#[test]
fn explicit_upgrade_writes_exact_current_bytes() {
    let fixture = Fixture::new();
    let target = fixture.target();
    fs::write(&target, LEGACY).unwrap();
    let before = fixture.names();
    assert_eq!(upgrade_file(&target).unwrap(), UpgradeOutcome::Upgraded);
    assert_file(&target, CURRENT);
    assert_eq!(fixture.names(), before);
    assert_eq!(
        upgrade_file(&target).unwrap(),
        UpgradeOutcome::AlreadyCurrent
    );
    assert_file(&target, CURRENT);
    assert_eq!(fixture.names(), before);
}

#[test]
fn prepared_source_change_refuses_before_stage() {
    let fixture = Fixture::new();
    let target = fixture.target();
    fs::write(&target, LEGACY).unwrap();
    let changed = b"RUST_TODO_V1\n1\tchanged\n";
    let prepared = upgrade_plan(&fs::read(&target).unwrap());
    fs::write(&target, changed).unwrap();
    let before = fixture.names();
    let result = apply_prepared(&target, prepared);
    assert!(matches!(result, Err(UpgradeError::SourceChanged)));
    assert_file(&target, changed);
    assert_eq!(fixture.names(), before);

    let prepared = upgrade_plan(LEGACY);
    fs::write(fixture.stage(), STAGE_SENTINEL).unwrap();
    let before = fixture.names();
    let result = apply_prepared(&target, prepared);
    assert!(matches!(result, Err(UpgradeError::SourceChanged)));
    assert_file(&target, changed);
    assert_file(&fixture.stage(), STAGE_SENTINEL);
    assert_eq!(fixture.names(), before);
}

#[test]
fn stage_collision_preserves_both_files() {
    let fixture = Fixture::new();
    let target = fixture.target();
    let stage = fixture.stage();
    fs::write(&target, LEGACY).unwrap();
    fs::write(&stage, STAGE_SENTINEL).unwrap();
    let before = fixture.names();
    let result = upgrade_file(&target);
    assert_eq!(
        io_phase(&result),
        Some(UpgradePhase::CreateStage),
        "{result:?}"
    );
    assert_file(&target, LEGACY);
    assert_file(&stage, STAGE_SENTINEL);
    assert_eq!(fixture.names(), before);
    fs::remove_file(&stage).unwrap();

    fs::create_dir(&stage).unwrap();
    let nested = stage.join("keep");
    fs::write(&nested, STAGE_SENTINEL).unwrap();
    let result = upgrade_file(&target);
    assert_eq!(
        io_phase(&result),
        Some(UpgradePhase::CreateStage),
        "{result:?}"
    );
    assert_file(&target, LEGACY);
    assert_file(&nested, STAGE_SENTINEL);
    assert_eq!(fixture.names(), before);

    #[cfg(unix)]
    {
        fs::remove_dir_all(&stage).unwrap();
        let referent = fixture.0.join("keep");
        fs::write(&referent, STAGE_SENTINEL).unwrap();
        std::os::unix::fs::symlink(&referent, &stage).unwrap();
        let before = fixture.names();
        let result = upgrade_file(&target);
        assert_eq!(
            io_phase(&result),
            Some(UpgradePhase::CreateStage),
            "{result:?}"
        );
        assert_file(&target, LEGACY);
        assert_file(&referent, STAGE_SENTINEL);
        assert_eq!(fs::read_link(&stage).unwrap(), referent);
        assert_eq!(fixture.names(), before);
    }
}

#[test]
fn missing_source_is_not_created() {
    let fixture = Fixture::new();
    let missing = fixture.0.join("absent").join("todo.txt");
    let result = upgrade_file(&missing);
    assert!(
        matches!(result, Err(UpgradeError::Io { phase: UpgradePhase::Read, ref source })
        if source.kind() == ErrorKind::NotFound),
        "{result:?}"
    );
    assert!(fixture.names().is_empty());
}

#[test]
fn source_error_retains_original_io_cause() {
    let fixture = Fixture::new();
    let target = fixture.target();
    fs::write(&target, LEGACY).unwrap();
    fs::write(fixture.stage(), STAGE_SENTINEL).unwrap();
    let error = upgrade_file(&target).unwrap_err();
    let UpgradeError::Io {
        phase: UpgradePhase::CreateStage,
        ref source,
    } = error
    else {
        panic!("expected the staging error: {error:?}");
    };
    let cause = error
        .source()
        .unwrap()
        .downcast_ref::<std::io::Error>()
        .unwrap();
    assert!(std::ptr::eq(cause, source));
    assert_eq!(cause.kind(), ErrorKind::AlreadyExists);
    assert_file(&target, LEGACY);
    assert_file(&fixture.stage(), STAGE_SENTINEL);
}
`;

export const upgradeExample = String.raw`use file_schema_evolution::{UpgradeOutcome, upgrade_file};
use std::{
    env,
    error::Error,
    io::{self, Write},
    path::Path,
};

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args_os().skip(1);
    let path = args.next().ok_or("podaj ścieżkę pliku do aktualizacji")?;
    if args.next().is_some() {
        return Err("podaj dokładnie jedną ścieżkę".into());
    }

    let message = match upgrade_file(Path::new(&path))? {
        UpgradeOutcome::AlreadyCurrent => "Plik ma już poprawny format V2.",
        UpgradeOutcome::Upgraded => "Plik został zaktualizowany do formatu V2.",
    };
    // A reporting error here happens after the file outcome is settled.
    writeln!(io::stdout().lock(), "{message}")?;
    Ok(())
}
`;

export const packageReadme = String.raw`# Jawna aktualizacja formatu pliku

Uzupełnij ciało funkcji normalize w src/model.rs. Wersja V1 przydziela
identyfikatory według kolejności wierszy. Zachowaj tytuły, stany i powtórzenia.
Wersja V2 zachowuje zapisane identyfikatory oraz historię numeracji NEXT.

Funkcje load i prepare_upgrade otrzymują bajty i nie zapisują pliku.
Przykład upgrade uruchamia osobną, jawną aktualizację wskazanego pliku.
Najpierw sprawdź działanie na własnej kopii pliku testowego.

Aktualizacja zakłada jednego zapisującego. Porównanie bajtów wykrywa zmianę,
która już zaszła. Nie blokuje kolejnego zapisu. Tymczasowy plik powstaje obok
oryginału, a pomyślne zastąpienie przez rename kończy aktualizację. Program
nie synchronizuje katalogu i nie gwarantuje zachowania danych po utracie
zasilania. Błąd wypisania komunikatu po udanym rename jest błędem raportowania.
Aktualizacja pliku pozostaje wtedy wykonana.

Bez zewnętrznych zależności. W katalogu rozpakowanego projektu uruchom:

    cargo generate-lockfile --offline
    cargo test --offline --locked
    cargo run --offline --locked --example upgrade -- ścieżka/do/kopii.txt
`;
