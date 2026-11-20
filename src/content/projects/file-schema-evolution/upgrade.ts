// SPDX-License-Identifier: MIT

export const upgradeSource = String.raw`use crate::{LoadError, Preparation, PreparedUpgrade, prepare_upgrade};
use std::{
    error::Error,
    fmt,
    fs::{self, OpenOptions},
    io::{self, Write},
    path::Path,
};

#[derive(Debug, Eq, PartialEq)]
pub enum UpgradeOutcome {
    AlreadyCurrent,
    Upgraded,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpgradePhase {
    Read,
    CreateStage,
    WriteStage,
    SyncStage,
    Rename,
}

#[derive(Debug)]
pub enum UpgradeError {
    Load(LoadError),
    SourceChanged,
    Io {
        phase: UpgradePhase,
        source: io::Error,
    },
}

impl fmt::Display for UpgradeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Load(error) => write!(formatter, "{error}"),
            Self::SourceChanged => formatter.write_str("source bytes changed after preparation"),
            Self::Io { phase, source } => write!(formatter, "{phase:?}: {source}"),
        }
    }
}

impl Error for UpgradeError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Load(error) => Some(error),
            Self::Io { source, .. } => Some(source),
            Self::SourceChanged => None,
        }
    }
}

fn io_error(phase: UpgradePhase, source: io::Error) -> UpgradeError {
    UpgradeError::Io { phase, source }
}

pub fn upgrade_file(path: &Path) -> Result<UpgradeOutcome, UpgradeError> {
    let bytes = fs::read(path).map_err(|source| io_error(UpgradePhase::Read, source))?;
    match prepare_upgrade(&bytes).map_err(UpgradeError::Load)? {
        Preparation::AlreadyCurrent => Ok(UpgradeOutcome::AlreadyCurrent),
        Preparation::Upgrade(plan) => apply_prepared(path, plan),
    }
}

pub fn apply_prepared(path: &Path, plan: PreparedUpgrade) -> Result<UpgradeOutcome, UpgradeError> {
    let observed = fs::read(path).map_err(|source| io_error(UpgradePhase::Read, source))?;
    if observed != plan.original() {
        return Err(UpgradeError::SourceChanged);
    }
    commit(path, plan.replacement())?;
    Ok(UpgradeOutcome::Upgraded)
}

fn commit(target: &Path, replacement: &[u8]) -> Result<(), UpgradeError> {
    let mut stage = target.as_os_str().to_os_string();
    stage.push(".upgrade-tmp");
    let stage = Path::new(&stage);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(stage)
        .map_err(|source| io_error(UpgradePhase::CreateStage, source))?;

    let written = file
        .write_all(replacement)
        .map_err(|source| io_error(UpgradePhase::WriteStage, source))
        .and_then(|()| {
            file.sync_all()
                .map_err(|source| io_error(UpgradePhase::SyncStage, source))
        });
    drop(file);

    // Once rename succeeds, the replacement is committed.
    let result = written.and_then(|()| {
        fs::rename(stage, target).map_err(|source| io_error(UpgradePhase::Rename, source))
    });
    if result.is_err() {
        let _ = fs::remove_file(stage);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn rename_error_cleans_owned_stage() {
        let root = std::env::temp_dir().join(format!("file-schema-rename-{}", std::process::id()));
        fs::create_dir(&root).unwrap();
        struct Cleanup<'a>(&'a Path);
        impl Drop for Cleanup<'_> {
            fn drop(&mut self) {
                let _ = fs::remove_dir_all(self.0);
            }
        }
        let _cleanup = Cleanup(&root);
        let target = root.join("target");
        fs::create_dir(&target).unwrap();
        let sentinel = target.join("keep");
        fs::write(&sentinel, b"directory content").unwrap();

        let error = commit(&target, b"replacement").unwrap_err();
        let UpgradeError::Io {
            phase: UpgradePhase::Rename,
            ref source,
        } = error
        else {
            panic!("expected a rename error: {error:?}");
        };
        let cause = error.source().unwrap().downcast_ref::<io::Error>().unwrap();
        assert!(std::ptr::eq(cause, source));
        assert_eq!(fs::read(&sentinel).unwrap(), b"directory content");
        assert_eq!(fs::read_dir(&target).unwrap().count(), 1);
        assert_eq!(fs::read_dir(&root).unwrap().count(), 1);
        assert!(!root.join("target.upgrade-tmp").exists());
    }
}
`;
