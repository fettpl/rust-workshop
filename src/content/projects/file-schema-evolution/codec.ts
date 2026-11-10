// SPDX-License-Identifier: MIT

export const codecSource = String.raw`use std::{collections::HashSet, error::Error, fmt, fmt::Write, num::NonZeroU64, str};

use crate::model::{
    ConversionError, Decoded, Loaded, NextId, Todo, current_from_checked_rows, legacy_from_rows,
    normalize, valid_title,
};

const V1: &str = "RUST_TODO_V1";
const V2: &str = "RUST_TODO_V2";
const PREFIX: &str = "RUST_TODO_V";

#[derive(Debug, Eq, PartialEq)]
pub enum FormatError {
    InvalidUtf8,
    InvalidHeader,
    UnsupportedVersion(u64),
    MissingFinalNewline,
    InvalidRow { line: usize },
    InvalidStatus { line: usize },
    InvalidTitle { line: usize },
    InvalidId { line: usize },
    DuplicateId { line: usize, id: u64 },
    InvalidNextId,
}

#[derive(Debug, Eq, PartialEq)]
pub enum LoadError {
    Format(FormatError),
    Conversion(ConversionError),
}

enum Header {
    Legacy,
    Current(NextId),
}

fn positive_decimal(token: &str) -> Option<NonZeroU64> {
    if token.starts_with('0') || !token.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    token.parse().ok().and_then(NonZeroU64::new)
}

fn parse_header(header: &str) -> Result<Header, FormatError> {
    if header.contains('\r') {
        return Err(FormatError::InvalidHeader);
    }
    if header == V1 {
        return Ok(Header::Legacy);
    }
    if let Some((version, token)) = header.split_once('\t') {
        if version != V2 || token.contains('\t') {
            return Err(FormatError::InvalidHeader);
        }
        let next = if token == "-" {
            NextId::Exhausted
        } else {
            NextId::Available(positive_decimal(token).ok_or(FormatError::InvalidNextId)?)
        };
        return Ok(Header::Current(next));
    }
    let version = header.strip_prefix(PREFIX).and_then(positive_decimal);
    match version {
        Some(version) if version.get() >= 3 => Err(FormatError::UnsupportedVersion(version.get())),
        _ => Err(FormatError::InvalidHeader),
    }
}

fn status_and_title(status: &str, title: &str, line: usize) -> Result<(bool, String), FormatError> {
    let done = match status {
        "0" => false,
        "1" => true,
        _ => return Err(FormatError::InvalidStatus { line }),
    };
    if !valid_title(title) {
        return Err(FormatError::InvalidTitle { line });
    }
    Ok((done, title.to_owned()))
}

pub fn decode(bytes: &[u8]) -> Result<Decoded, FormatError> {
    let text = str::from_utf8(bytes).map_err(|_| FormatError::InvalidUtf8)?;
    let (header, body) = text.split_once('\n').ok_or(FormatError::InvalidHeader)?;
    let header = parse_header(header)?;
    if !text.ends_with('\n') {
        return Err(FormatError::MissingFinalNewline);
    }

    let lines = body.split_terminator('\n').enumerate();
    match header {
        Header::Legacy => {
            let mut rows = Vec::new();
            for (offset, row) in lines {
                let line = offset + 2;
                let (status, title) = row
                    .split_once('\t')
                    .ok_or(FormatError::InvalidRow { line })?;
                rows.push(status_and_title(status, title, line)?);
            }
            Ok(Decoded::Legacy(legacy_from_rows(rows)))
        }
        Header::Current(next) => {
            let mut rows = Vec::new();
            for (offset, row) in lines {
                let line = offset + 2;
                let (id, remainder) = row
                    .split_once('\t')
                    .ok_or(FormatError::InvalidRow { line })?;
                let (status, title) = remainder
                    .split_once('\t')
                    .ok_or(FormatError::InvalidRow { line })?;
                let id = positive_decimal(id).ok_or(FormatError::InvalidId { line })?;
                let (done, title) = status_and_title(status, title, line)?;
                rows.push((id, done, title));
            }

            // Domain errors are considered only once every physical row parses.
            let mut seen = HashSet::with_capacity(rows.len());
            for (offset, (id, _, _)) in rows.iter().enumerate() {
                if !seen.insert(*id) {
                    return Err(FormatError::DuplicateId {
                        line: offset + 2,
                        id: id.get(),
                    });
                }
            }
            if let NextId::Available(next_id) = next {
                if rows.iter().any(|(id, _, _)| *id >= next_id) {
                    return Err(FormatError::InvalidNextId);
                }
            }
            Ok(Decoded::Current(current_from_checked_rows(rows, next)))
        }
    }
}

pub fn encode_current(todo: &Todo) -> Vec<u8> {
    let mut output = String::new();
    match todo.next_id() {
        NextId::Available(next) => writeln!(output, "{V2}\t{next}"),
        NextId::Exhausted => writeln!(output, "{V2}\t-"),
    }
    .expect("writing to a String cannot fail");
    for entry in todo.entries() {
        writeln!(
            output,
            "{}\t{}\t{}",
            entry.id(),
            u8::from(entry.done()),
            entry.title()
        )
        .expect("writing to a String cannot fail");
    }
    output.into_bytes()
}

pub fn load(bytes: &[u8]) -> Result<Loaded, LoadError> {
    let decoded = decode(bytes).map_err(LoadError::Format)?;
    normalize(decoded).map_err(LoadError::Conversion)
}

impl fmt::Display for FormatError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidUtf8 => formatter.write_str("file is not valid UTF-8"),
            Self::InvalidHeader => formatter.write_str("invalid file header"),
            Self::UnsupportedVersion(version) => {
                write!(formatter, "unsupported file version {version}")
            }
            Self::MissingFinalNewline => formatter.write_str("file must end with a line feed"),
            Self::InvalidRow { line } => write!(formatter, "invalid row at line {line}"),
            Self::InvalidStatus { line } => write!(formatter, "invalid status at line {line}"),
            Self::InvalidTitle { line } => write!(formatter, "invalid title at line {line}"),
            Self::InvalidId { line } => write!(formatter, "invalid identifier at line {line}"),
            Self::DuplicateId { line, id } => {
                write!(formatter, "duplicate identifier {id} at line {line}")
            }
            Self::InvalidNextId => formatter.write_str("invalid next identifier"),
        }
    }
}

impl Error for FormatError {}

impl fmt::Display for LoadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Format(error) => write!(formatter, "cannot decode file: {error}"),
            Self::Conversion(error) => write!(formatter, "cannot normalize file: {error}"),
        }
    }
}

impl Error for LoadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Format(error) => Some(error),
            Self::Conversion(error) => Some(error),
        }
    }
}
`;
