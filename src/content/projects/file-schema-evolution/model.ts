// SPDX-License-Identifier: MIT

const normalize = String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
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
}`;
const unfinishedNormalize = String.raw`pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
    let _ = decoded;
    todo!("implement normalization")
}`;

const beforeNormalize = String.raw`use std::{error::Error, fmt, num::NonZeroU64};

use crate::codec::{LoadError, encode_current, load};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Version {
    V1,
    V2,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NextId {
    Available(NonZeroU64),
    Exhausted,
}

#[derive(Debug, Eq, PartialEq)]
pub struct Entry {
    id: NonZeroU64,
    done: bool,
    title: String,
}

impl Entry {
    pub fn id(&self) -> NonZeroU64 {
        self.id
    }

    pub fn done(&self) -> bool {
        self.done
    }

    pub fn title(&self) -> &str {
        &self.title
    }
}

#[derive(Debug, Eq, PartialEq)]
pub struct LegacyEntry {
    done: bool,
    title: String,
}

impl LegacyEntry {
    pub fn done(&self) -> bool {
        self.done
    }

    pub fn title(&self) -> &str {
        &self.title
    }
}

#[derive(Debug, Eq, PartialEq)]
pub struct LegacyTodo {
    entries: Vec<LegacyEntry>,
}

impl LegacyTodo {
    pub fn entries(&self) -> &[LegacyEntry] {
        &self.entries
    }
}

#[derive(Debug, Eq, PartialEq)]
pub struct Todo {
    entries: Vec<Entry>,
    next_id: NextId,
}

impl Todo {
    pub fn entries(&self) -> &[Entry] {
        &self.entries
    }

    pub fn next_id(&self) -> NextId {
        self.next_id
    }

    pub fn append(&mut self, title: String, done: bool) -> Result<NonZeroU64, EditError> {
        if !valid_title(&title) {
            return Err(EditError::InvalidTitle);
        }
        let NextId::Available(id) = self.next_id else {
            return Err(EditError::Exhausted);
        };
        self.next_id = next_after(id.get());
        self.entries.push(Entry { id, done, title });
        Ok(id)
    }

    pub fn remove(&mut self, id: NonZeroU64) -> Result<Entry, EditError> {
        let position = self
            .entries
            .iter()
            .position(|entry| entry.id == id)
            .ok_or(EditError::NotFound)?;
        Ok(self.entries.remove(position))
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum Decoded {
    Legacy(LegacyTodo),
    Current(Todo),
}

#[derive(Debug, Eq, PartialEq)]
pub struct Loaded {
    version: Version,
    todo: Todo,
}

impl Loaded {
    pub fn version(&self) -> Version {
        self.version
    }

    pub fn todo(&self) -> &Todo {
        &self.todo
    }

    pub fn into_todo(self) -> Todo {
        self.todo
    }
}

#[derive(Debug)]
pub struct PreparedUpgrade {
    original: Vec<u8>,
    replacement: Vec<u8>,
}

impl PreparedUpgrade {
    pub fn original(&self) -> &[u8] {
        &self.original
    }

    pub fn replacement(&self) -> &[u8] {
        &self.replacement
    }
}

#[derive(Debug)]
pub enum Preparation {
    AlreadyCurrent,
    Upgrade(PreparedUpgrade),
}

#[derive(Debug, Eq, PartialEq)]
pub enum ConversionError {
    TooManyLegacyRecords,
}

#[derive(Debug, Eq, PartialEq)]
pub enum EditError {
    InvalidTitle,
    Exhausted,
    NotFound,
}

pub(crate) fn legacy_from_rows(rows: Vec<(bool, String)>) -> LegacyTodo {
    LegacyTodo {
        entries: rows
            .into_iter()
            .map(|(done, title)| LegacyEntry { done, title })
            .collect(),
    }
}

pub(crate) fn current_from_checked_rows(
    rows: Vec<(NonZeroU64, bool, String)>,
    next: NextId,
) -> Todo {
    Todo {
        entries: rows
            .into_iter()
            .map(|(id, done, title)| Entry { id, done, title })
            .collect(),
        next_id: next,
    }
}

pub(crate) fn into_legacy_rows(value: LegacyTodo) -> Vec<(bool, String)> {
    value
        .entries
        .into_iter()
        .map(|entry| (entry.done, entry.title))
        .collect()
}

pub(crate) fn valid_title(title: &str) -> bool {
    !title.trim().is_empty() && !title.contains(['\r', '\n'])
}

fn next_after(last: u64) -> NextId {
    last.checked_add(1)
        .and_then(NonZeroU64::new)
        .map_or(NextId::Exhausted, NextId::Available)
}

`;
const afterNormalize = String.raw`

pub fn prepare_upgrade(bytes: &[u8]) -> Result<Preparation, LoadError> {
    let loaded = load(bytes)?;
    if loaded.version() == Version::V2 {
        return Ok(Preparation::AlreadyCurrent);
    }
    Ok(Preparation::Upgrade(PreparedUpgrade {
        original: bytes.to_vec(),
        replacement: encode_current(loaded.todo()),
    }))
}

impl fmt::Display for ConversionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("too many legacy records for positive 64-bit identifiers")
    }
}

impl Error for ConversionError {}

impl fmt::Display for EditError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidTitle => "title must contain text and cannot contain a line break",
            Self::Exhausted => "all identifiers have been allocated",
            Self::NotFound => "entry identifier was not found",
        })
    }
}

impl Error for EditError {}
`;

export const modelSource = beforeNormalize + normalize + afterNormalize;
export const starterModelSource =
  beforeNormalize + unfinishedNormalize + afterNormalize;

export const libSource = String.raw`mod codec;
mod model;
mod upgrade;

pub use codec::{FormatError, LoadError, decode, encode_current, load};
pub use model::{
    ConversionError, Decoded, EditError, Entry, LegacyEntry, LegacyTodo, Loaded, NextId,
    Preparation, PreparedUpgrade, Todo, Version, normalize, prepare_upgrade,
};
pub use upgrade::{UpgradeError, UpgradeOutcome, UpgradePhase, apply_prepared, upgrade_file};
`;
