import type { ProjectPackage } from "../../../domain/types";

export const coreManifest = String.raw`[package]
name = "ingest-core"
version = "1.0.0"
edition = "2024"
rust-version = "1.85.0"
publish = false

[lints.rust]
unsafe_code = "forbid"
`;

export const coreStarterDomain = String.raw`#![forbid(unsafe_code)]

const MAX_IDENTIFIER_BYTES: usize = 32;
pub(crate) const MAX_MESSAGE_BYTES: usize = 2048;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValidationError {
    Source,
    Key,
    Message,
    Correlation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    source: String,
    key: String,
    level: Level,
    message: String,
    correlation: Option<String>,
}

impl Event {
    pub fn new(
        source: String,
        key: String,
        level: Level,
        message: String,
    ) -> Result<Self, ValidationError> {
        todo!("zweryfikuj source, key i message")
    }

    pub fn with_correlation(self, correlation: Option<String>) -> Result<Self, ValidationError> {
        todo!("zweryfikuj correlation")
    }

    pub fn source(&self) -> &str {
        todo!("udostępnij source")
    }
    pub fn key(&self) -> &str {
        todo!("udostępnij key")
    }
    pub fn level(&self) -> Level {
        todo!("udostępnij level")
    }
    pub fn message(&self) -> &str {
        todo!("udostępnij message")
    }
    pub fn correlation(&self) -> Option<&str> {
        todo!("udostępnij correlation")
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Disposition {
    Inserted,
    Duplicate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Receipt {
    pub sequence: u64,
    pub disposition: Disposition,
}

pub(crate) const MAX_FRAME_BYTES: usize = 4096;
`;

export const coreStarterProtocol = String.raw`#![forbid(unsafe_code)]

use crate::domain::{Event, ValidationError};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProtocolError {
    TooLarge,
    Utf8,
    Version,
    Fields,
    Validation(ValidationError),
}

pub fn decode_frame(_bytes: &[u8]) -> Result<Event, ProtocolError> {
    todo!("zdekoduj ograniczoną ramkę")
}

pub fn encode_v1(_event: &Event) -> Result<Vec<u8>, ProtocolError> {
    todo!("zakoduj wersję 1")
}

pub fn encode_v2(_event: &Event) -> Vec<u8> {
    todo!("zakoduj wersję 2")
}
`;

export const coreSolutionDomain = String.raw`#![forbid(unsafe_code)]

pub(crate) const MAX_IDENTIFIER_BYTES: usize = 32;
pub(crate) const MAX_MESSAGE_BYTES: usize = 2048;

fn valid_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_IDENTIFIER_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

fn valid_message(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_MESSAGE_BYTES
        && !value
            .bytes()
            .any(|byte| matches!(byte, b'\t' | b'\r' | b'\n'))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValidationError {
    Source,
    Key,
    Message,
    Correlation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Event {
    source: String,
    key: String,
    level: Level,
    message: String,
    correlation: Option<String>,
}

impl Event {
    pub fn new(
        source: String,
        key: String,
        level: Level,
        message: String,
    ) -> Result<Self, ValidationError> {
        if !valid_identifier(&source) {
            return Err(ValidationError::Source);
        }
        if !valid_identifier(&key) {
            return Err(ValidationError::Key);
        }
        if !valid_message(&message) {
            return Err(ValidationError::Message);
        }
        Ok(Self {
            source,
            key,
            level,
            message,
            correlation: None,
        })
    }

    pub fn with_correlation(
        mut self,
        correlation: Option<String>,
    ) -> Result<Self, ValidationError> {
        if let Some(value) = &correlation {
            if value == "-" || !valid_identifier(value) {
                return Err(ValidationError::Correlation);
            }
        }
        self.correlation = correlation;
        Ok(self)
    }

    pub fn source(&self) -> &str {
        &self.source
    }
    pub fn key(&self) -> &str {
        &self.key
    }
    pub fn level(&self) -> Level {
        self.level
    }
    pub fn message(&self) -> &str {
        &self.message
    }
    pub fn correlation(&self) -> Option<&str> {
        self.correlation.as_deref()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Disposition {
    Inserted,
    Duplicate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Receipt {
    pub sequence: u64,
    pub disposition: Disposition,
}
`;

export const coreSolutionProtocol = String.raw`#![forbid(unsafe_code)]

use crate::domain::{Event, Level, ValidationError};

const MAX_FRAME_BYTES: usize = 4096;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProtocolError {
    TooLarge,
    Utf8,
    Version,
    Fields,
    Validation(ValidationError),
}

fn parse_level(value: &str) -> Option<Level> {
    match value {
        "INFO" => Some(Level::Info),
        "WARN" => Some(Level::Warn),
        "ERROR" => Some(Level::Error),
        _ => None,
    }
}

fn level_text(level: Level) -> &'static str {
    match level {
        Level::Info => "INFO",
        Level::Warn => "WARN",
        Level::Error => "ERROR",
    }
}

pub fn decode_frame(bytes: &[u8]) -> Result<Event, ProtocolError> {
    let content_len = if bytes.last().copied() == Some(b'\n') {
        bytes.len() - 1
    } else {
        bytes.len()
    };
    if content_len > MAX_FRAME_BYTES {
        return Err(ProtocolError::TooLarge);
    }
    if !bytes.ends_with(b"\n") {
        return Err(ProtocolError::Fields);
    }
    let line = std::str::from_utf8(&bytes[..bytes.len() - 1]).map_err(|_| ProtocolError::Utf8)?;
    let fields: Vec<&str> = line.split('\t').collect();
    let version = fields.first().copied().ok_or(ProtocolError::Fields)?;
    match version {
        "1" => {
            if fields.len() != 5 {
                return Err(ProtocolError::Fields);
            }
            let level = parse_level(fields[3])
                .ok_or(ProtocolError::Validation(ValidationError::Message))?;
            Event::new(
                fields[1].to_owned(),
                fields[2].to_owned(),
                level,
                fields[4].to_owned(),
            )
            .map_err(ProtocolError::Validation)
        }
        "2" => {
            if fields.len() != 6 {
                return Err(ProtocolError::Fields);
            }
            let level = parse_level(fields[3])
                .ok_or(ProtocolError::Validation(ValidationError::Message))?;
            let event = Event::new(
                fields[1].to_owned(),
                fields[2].to_owned(),
                level,
                fields[5].to_owned(),
            )
            .map_err(ProtocolError::Validation)?;
            let correlation = if fields[4] == "-" {
                None
            } else {
                Some(fields[4].to_owned())
            };
            event
                .with_correlation(correlation)
                .map_err(ProtocolError::Validation)
        }
        _ => Err(ProtocolError::Version),
    }
}

pub fn encode_v1(event: &Event) -> Result<Vec<u8>, ProtocolError> {
    if event.correlation().is_some() {
        return Err(ProtocolError::Fields);
    }
    Ok(format!(
        "1\t{}\t{}\t{}\t{}\n",
        event.source(),
        event.key(),
        level_text(event.level()),
        event.message()
    )
    .into_bytes())
}

pub fn encode_v2(event: &Event) -> Vec<u8> {
    format!(
        "2\t{}\t{}\t{}\t{}\t{}\n",
        event.source(),
        event.key(),
        level_text(event.level()),
        event.correlation().unwrap_or("-"),
        event.message()
    )
    .into_bytes()
}
`;

export const coreLibStarter = String.raw`#![forbid(unsafe_code)]

mod domain;
mod protocol;

pub use domain::{Disposition, Event, Level, Receipt, ValidationError};
pub use protocol::{ProtocolError, decode_frame, encode_v1, encode_v2};
`;

export const coreLibSolution = coreLibStarter;

export const corePublicApiTests = String.raw`use ingest_core::{
    Disposition, Event, Level, ProtocolError, ValidationError, decode_frame, encode_v1, encode_v2,
};

fn event(message: &str) -> Event {
    Event::new(
        "source".to_owned(),
        "key".to_owned(),
        Level::Info,
        message.to_owned(),
    )
    .unwrap()
}

#[test]
fn empty_and_boundary_identifiers_are_checked() {
    assert_eq!(
        Event::new(String::new(), "key".to_owned(), Level::Info, "m".to_owned()),
        Err(ValidationError::Source)
    );
    assert_eq!(
        Event::new("s".repeat(32), "k".repeat(32), Level::Info, "m".to_owned())
            .unwrap()
            .source()
            .len(),
        32
    );
    assert_eq!(
        Event::new(
            "s".repeat(33),
            "key".to_owned(),
            Level::Info,
            "m".to_owned()
        ),
        Err(ValidationError::Source)
    );
    assert_eq!(
        Event::new(
            "source".to_owned(),
            "k".repeat(33),
            Level::Info,
            "m".to_owned()
        ),
        Err(ValidationError::Key)
    );
}

#[test]
fn multibyte_message_is_limited_by_utf8_bytes() {
    assert!(
        Event::new(
            "s".to_owned(),
            "k".to_owned(),
            Level::Info,
            "ą".repeat(1024)
        )
        .is_ok()
    );
    assert_eq!(
        Event::new(
            "s".to_owned(),
            "k".to_owned(),
            Level::Info,
            "ą".repeat(1025)
        ),
        Err(ValidationError::Message)
    );
}

#[test]
fn control_delimiters_are_rejected() {
    for message in ["a\tb", "a\rb", "a\nb"] {
        assert_eq!(
            Event::new(
                "s".to_owned(),
                "k".to_owned(),
                Level::Info,
                message.to_owned()
            ),
            Err(ValidationError::Message)
        );
    }
    assert_eq!(
        event("m").with_correlation(Some("bad value".to_owned())),
        Err(ValidationError::Correlation)
    );
}

#[test]
fn old_event_constructor_and_accessors_remain_callable() {
    let value = Event::new(
        "src".to_owned(),
        "request".to_owned(),
        Level::Warn,
        "hello".to_owned(),
    )
    .unwrap();
    assert_eq!(
        (
            value.source(),
            value.key(),
            value.level(),
            value.message(),
            value.correlation()
        ),
        ("src", "request", Level::Warn, "hello", None)
    );
    let receipt = ingest_core::Receipt {
        sequence: 7,
        disposition: Disposition::Inserted,
    };
    assert_eq!(receipt.sequence, 7);
}

#[test]
fn v1_and_v2_normalize_absent_correlation() {
    let original = event("hello");
    let v1 = decode_frame(&encode_v1(&original).unwrap()).unwrap();
    let v2 = decode_frame(&encode_v2(&original)).unwrap();
    assert_eq!(v1, original);
    assert_eq!(v2, original);
    let correlated = original
        .with_correlation(Some("trace-1".to_owned()))
        .unwrap();
    assert_eq!(encode_v1(&correlated), Err(ProtocolError::Fields));
    assert_eq!(
        decode_frame(&encode_v2(&correlated)).unwrap().correlation(),
        Some("trace-1")
    );
}

#[test]
fn correlation_sentinel_is_rejected() {
    assert_eq!(
        event("hello").with_correlation(Some("-".to_owned())),
        Err(ValidationError::Correlation)
    );
}

#[test]
fn frame_limit_is_measured_before_terminal_newline() {
    let mut at_limit = vec![b'a'; 4096];
    at_limit.push(b'\n');
    assert_eq!(decode_frame(&at_limit), Err(ProtocolError::Version));
    let mut over_limit = vec![b'a'; 4097];
    over_limit.push(b'\n');
    assert_eq!(decode_frame(&over_limit), Err(ProtocolError::TooLarge));
}

#[test]
fn unsupported_version_and_extra_fields_are_rejected() {
    assert_eq!(
        decode_frame(b"9\tsource\tkey\tINFO\tmessage\n"),
        Err(ProtocolError::Version)
    );
    assert_eq!(
        decode_frame(b"1\tsource\tkey\tINFO\tmessage\textra\n"),
        Err(ProtocolError::Fields)
    );
    assert_eq!(
        decode_frame(b"1\tsource\tkey\tINFO\tmessage"),
        Err(ProtocolError::Fields)
    );
    assert_eq!(
        decode_frame(&vec![b'a'; 4097]),
        Err(ProtocolError::TooLarge)
    );
}
`;

export const coreProtocolPropertyTests = String.raw`use ingest_core::{Event, Level, ValidationError, decode_frame, encode_v1, encode_v2};

fn identifier_boundary_values() -> Vec<String> {
    [1usize, 31, 32]
        .into_iter()
        .map(|length| "a".repeat(length))
        .collect()
}

fn bounded_utf8_messages() -> Vec<String> {
    let alphabet = ["a", "ą", "🙂"];
    let mut values = Vec::new();
    for length in 1..=3 {
        let mut number = 0usize;
        while number < alphabet.len().pow(length as u32) {
            let mut value = String::new();
            let mut cursor = number;
            for _ in 0..length {
                value.push_str(alphabet[cursor % alphabet.len()]);
                cursor /= alphabet.len();
            }
            values.push(value);
            number += 1;
        }
    }
    values
}

fn correlations() -> [Option<&'static str>; 3] {
    [None, Some("trace"), Some("x")]
}

#[test]
fn bounded_utf8_messages_are_exhaustive_inputs() {
    let messages = bounded_utf8_messages();
    assert_eq!(
        messages.len(),
        39,
        "all finite UTF-8 combinations are covered"
    );
    assert!(
        messages
            .iter()
            .all(|message| !message.is_empty() && message.len() <= 2048)
    );
}

#[test]
fn identifier_boundaries_reject_empty_and_overbound_values() {
    assert_eq!(
        Event::new(String::new(), "key".to_owned(), Level::Info, "m".to_owned()),
        Err(ValidationError::Source)
    );
    assert_eq!(
        Event::new(
            "source".to_owned(),
            "k".repeat(33),
            Level::Info,
            "m".to_owned()
        ),
        Err(ValidationError::Key)
    );
    assert_eq!(
        identifier_boundary_values().len(),
        3,
        "lengths 1, 31 and 32 are covered"
    );
}

#[test]
fn decode_v2_round_trips_bounded_values_and_correlations() {
    let identifiers = identifier_boundary_values();
    let messages = bounded_utf8_messages();
    let mut cases = 0usize;
    for source in &identifiers {
        for key in &identifiers {
            for message in &messages {
                for level in [Level::Info, Level::Warn, Level::Error] {
                    for correlation in correlations() {
                        let event = Event::new(source.clone(), key.clone(), level, message.clone())
                            .unwrap()
                            .with_correlation(correlation.map(str::to_owned))
                            .unwrap();
                        assert_eq!(
                            decode_frame(&encode_v2(&event)).unwrap(),
                            event,
                            "source_len={} key_len={} message_len={} correlation={correlation:?}",
                            source.len(),
                            key.len(),
                            message.len()
                        );
                        cases += 1;
                    }
                }
            }
        }
    }
    assert_eq!(cases, 3 * 3 * 39 * 3 * 3, "bounded exhaustive V2 domain");
}

#[test]
fn v1_round_trips_every_level_for_correlation_free_values() {
    for level in [Level::Info, Level::Warn, Level::Error] {
        for message in bounded_utf8_messages() {
            let event = Event::new("source".to_owned(), "key".to_owned(), level, message).unwrap();
            assert_eq!(decode_frame(&encode_v1(&event).unwrap()).unwrap(), event);
        }
    }
}
`;

export const ingestCoreFiles: ProjectPackage["files"] = [
  { path: "crates/ingest-core/Cargo.toml", starter: coreManifest, solution: coreManifest },
  { path: "crates/ingest-core/src/lib.rs", starter: coreLibStarter, solution: coreLibSolution },
  { path: "crates/ingest-core/src/domain.rs", starter: coreStarterDomain, solution: coreSolutionDomain },
  { path: "crates/ingest-core/src/protocol.rs", starter: coreStarterProtocol, solution: coreSolutionProtocol },
  { path: "crates/ingest-core/tests/public_api.rs", starter: corePublicApiTests, solution: corePublicApiTests },
  { path: "crates/ingest-core/tests/protocol_properties.rs", starter: coreProtocolPropertyTests, solution: coreProtocolPropertyTests },
];
