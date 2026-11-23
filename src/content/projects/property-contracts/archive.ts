import type { ProjectPackage } from "../../../domain/types";

const manifest = String.raw`[package]
name = "property-contracts"
version = "1.0.0"
edition = "2024"
rust-version = "1.85.0"
publish = false

[dev-dependencies]
proptest = "=1.11.0"

[lints.rust]
unsafe_code = "forbid"
`;

const starterLib = String.raw`#![forbid(unsafe_code)]

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Record {
    pub timestamp: u64,
    pub level: Level,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParseError {
    MissingField,
    InvalidTimestamp,
    InvalidLevel,
    EmptyMessage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Summary {
    pub info: usize,
    pub warn: usize,
    pub error: usize,
    pub malformed: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedLine {
    pub number: usize,
    pub text: String,
    pub is_match: bool,
}

pub fn parse_record(_line: &str) -> Result<Record, ParseError> {
    todo!("parse TIMESTAMP LEVEL MESSAGE")
}

pub fn summarize(_lines: &[String], _filter: Option<Level>) -> Summary {
    todo!("classify every line, including malformed lines")
}

pub fn select_context(_lines: &[String], _query: &str, _context: usize) -> Vec<SelectedLine> {
    todo!("return the ordered union of context windows")
}
`;

const solutionLib = String.raw`#![forbid(unsafe_code)]
//! Pure functions used by the property-contract workshop.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Record {
    pub timestamp: u64,
    pub level: Level,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParseError {
    MissingField,
    InvalidTimestamp,
    InvalidLevel,
    EmptyMessage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Summary {
    pub info: usize,
    pub warn: usize,
    pub error: usize,
    pub malformed: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedLine {
    pub number: usize,
    pub text: String,
    pub is_match: bool,
}

pub fn parse_record(line: &str) -> Result<Record, ParseError> {
    let mut fields = line.splitn(3, ' ');
    let timestamp_text = fields
        .next()
        .filter(|value| !value.is_empty())
        .ok_or(ParseError::MissingField)?;
    if !timestamp_text.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(ParseError::InvalidTimestamp);
    }
    let timestamp = timestamp_text
        .parse::<u64>()
        .map_err(|_| ParseError::InvalidTimestamp)?;
    let level = match fields.next().ok_or(ParseError::MissingField)? {
        "INFO" => Level::Info,
        "WARN" => Level::Warn,
        "ERROR" => Level::Error,
        _ => return Err(ParseError::InvalidLevel),
    };
    let message = fields
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or(ParseError::EmptyMessage)?
        .to_owned();
    Ok(Record {
        timestamp,
        level,
        message,
    })
}

pub fn summarize(lines: &[String], filter: Option<Level>) -> Summary {
    let mut summary = Summary::default();
    for line in lines {
        let Ok(record) = parse_record(line) else {
            summary.malformed += 1;
            continue;
        };
        if filter.is_some_and(|expected| expected != record.level) {
            continue;
        }
        match record.level {
            Level::Info => summary.info += 1,
            Level::Warn => summary.warn += 1,
            Level::Error => summary.error += 1,
        }
    }
    summary
}

pub fn select_context(lines: &[String], query: &str, context: usize) -> Vec<SelectedLine> {
    if query.is_empty() {
        return Vec::new();
    }
    let matches: Vec<bool> = lines.iter().map(|line| line.contains(query)).collect();
    let mut selected = vec![false; lines.len()];
    for (index, is_match) in matches.iter().copied().enumerate() {
        if !is_match {
            continue;
        }
        let start = index.saturating_sub(context);
        let end = (index + context + 1).min(lines.len());
        selected[start..end].fill(true);
    }
    lines
        .iter()
        .enumerate()
        .filter(|(index, _)| selected[*index])
        .map(|(index, text)| SelectedLine {
            number: index + 1,
            text: text.clone(),
            is_match: matches[index],
        })
        .collect()
}
`;

const propertyTests = String.raw`use property_contracts::{Level, SelectedLine, Summary, parse_record, select_context, summarize};
use proptest::prelude::*;
use proptest::test_runner::FileFailurePersistence;

fn token_strategy() -> impl Strategy<Value = String> {
    prop::collection::vec(prop::sample::select(vec!['a', 'b', 'c', 'ą', ' ']), 0..=12)
        .prop_map(|chars| chars.into_iter().collect())
}

fn lines_strategy() -> impl Strategy<Value = Vec<String>> {
    prop::collection::vec(token_strategy(), 0..=24)
}

fn query_strategy() -> impl Strategy<Value = String> {
    prop::sample::select(vec!["a", "b", "ą", "z", " "]).prop_map(str::to_owned)
}

fn level_strategy() -> impl Strategy<Value = Level> {
    prop::sample::select(vec![Level::Info, Level::Warn, Level::Error])
}

fn record_line_strategy() -> impl Strategy<Value = String> {
    (
        0u16..=9999,
        level_strategy(),
        token_strategy().prop_filter("nonempty trimmed message", |message| {
            !message.trim().is_empty()
        }),
    )
        .prop_map(|(timestamp, level, message)| {
            let level = match level {
                Level::Info => "INFO",
                Level::Warn => "WARN",
                Level::Error => "ERROR",
            };
            format!("{timestamp} {level} {message}")
        })
}

fn mixed_lines_strategy() -> impl Strategy<Value = Vec<String>> {
    prop::collection::vec(
        prop_oneof![
            record_line_strategy(),
            Just(String::from("missing-level")),
            Just(String::from("nope UNKNOWN malformed")),
            Just(String::from("12 INFO")),
            Just(String::from("clock INFO ")),
            Just(String::from("12 INFO   ")),
        ],
        0..=24,
    )
}

fn oracle_select(lines: &[String], query: &str, context: usize) -> Vec<SelectedLine> {
    if query.is_empty() {
        return Vec::new();
    }
    let matching_indices: Vec<usize> = lines
        .iter()
        .enumerate()
        .filter_map(|(index, line)| line.find(query).map(|_| index))
        .collect();
    lines
        .iter()
        .enumerate()
        .filter(|(index, _)| {
            matching_indices
                .iter()
                .any(|matched| index.abs_diff(*matched) <= context)
        })
        .map(|(index, text)| SelectedLine {
            number: index + 1,
            text: text.clone(),
            is_match: matching_indices.contains(&index),
        })
        .collect()
}

fn classify_line(line: &str) -> Option<Level> {
    let mut fields = line.splitn(3, ' ');
    let timestamp = fields.next()?;
    if timestamp.is_empty() || !timestamp.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    let level = match fields.next()? {
        "INFO" => Level::Info,
        "WARN" => Level::Warn,
        "ERROR" => Level::Error,
        _ => return None,
    };
    if fields
        .next()
        .is_none_or(|message| message.trim().is_empty())
    {
        return None;
    }
    Some(level)
}

fn oracle_summary(lines: &[String], filter: Option<Level>) -> Summary {
    let mut expected = Summary::default();
    for line in lines {
        let Some(level) = classify_line(line) else {
            expected.malformed += 1;
            continue;
        };
        if filter.is_some_and(|expected| expected != level) {
            continue;
        }
        match level {
            Level::Info => expected.info += 1,
            Level::Warn => expected.warn += 1,
            Level::Error => expected.error += 1,
        }
    }
    expected
}

proptest! {
    #![proptest_config(ProptestConfig {
        cases: 64,
        max_shrink_iters: 64,
        failure_persistence: Some(Box::new(FileFailurePersistence::Direct(
            "proptest-regressions/property_contracts.txt",
        ))),
        .. ProptestConfig::default()
    })]

    #[test]
    fn selection_matches_an_independent_oracle(lines in lines_strategy(), query in query_strategy(), context in 0usize..=2) {
        prop_assert_eq!(select_context(&lines, &query, context), oracle_select(&lines, &query, context));
    }

    #[test]
    fn summary_preserves_malformed_count_when_filtering(lines in mixed_lines_strategy(), filter in prop_oneof![Just(None), level_strategy().prop_map(Some)]) {
        prop_assert_eq!(summarize(&lines, filter), oracle_summary(&lines, filter));
    }

    #[test]
    fn appending_a_nonmatching_suffix_preserves_context_zero(lines in lines_strategy(), query in query_strategy()) {
        let before = select_context(&lines, &query, 0);
        let mut extended = lines.clone();
        extended.push(String::from("!!!"));
        let after = select_context(&extended, &query, 0);
        prop_assert_eq!(after, before);
    }
}

#[test]
fn replay_saved_regression() {
    let saved = include_str!("../proptest-regressions/property_contracts.txt");
    assert!(saved.contains("# proptest regression file v1"));
    assert!(saved.contains("property-contracts/shrink-witness-v1"));
    assert!(saved.lines().any(|line| line.starts_with("cc ")));

    let lines: Vec<String> = saved
        .lines()
        .filter_map(|line| line.strip_prefix("# witness-line: "))
        .map(str::to_owned)
        .collect();
    let filter = saved
        .lines()
        .find_map(|line| line.strip_prefix("# witness-filter: "))
        .map(|level| match level {
            "INFO" => Level::Info,
            "WARN" => Level::Warn,
            "ERROR" => Level::Error,
            other => panic!("unknown witness filter: {other}"),
        });
    assert_eq!(lines.len(), 3);
    assert_eq!(
        summarize(&lines, filter),
        Summary {
            info: 0,
            warn: 0,
            error: 1,
            malformed: 1,
        }
    );
}

#[test]
fn parser_uses_trimmed_message_contract() {
    let record = parse_record("42 WARN   retry later  ").unwrap();
    assert_eq!(record.level, Level::Warn);
    assert_eq!(record.message, "retry later");
    assert_eq!(
        parse_record("42 WARN   "),
        Err(property_contracts::ParseError::EmptyMessage)
    );
    assert_eq!(
        parse_record("+42 WARN retry"),
        Err(property_contracts::ParseError::InvalidTimestamp)
    );
}
`;

const starterTests = String.raw`use proptest::prelude::*;
use proptest::strategy::BoxedStrategy;

// TODO(strategy): compose bounded generators for valid and malformed records.
fn lines_strategy() -> BoxedStrategy<Vec<String>> {
    todo!("build the bounded line strategy")
}

// TODO(strategy): generate a non-empty query and a small context.
fn query_strategy() -> BoxedStrategy<String> {
    todo!("build the query strategy")
}

// TODO(property): compare select_context with an independent index-distance oracle.
#[test]
fn selection_property() {
    let _ = lines_strategy;
    let _ = query_strategy;
    todo!("write the selection property")
}

// TODO(property): classify malformed records independently of the implementation.
#[test]
fn summary_property() {
    todo!("write the summary property")
}

// TODO(shrink): keep the failure while reducing the saved witness.
#[test]
fn shrink_saved_witness() {
    todo!("implement the shrinking exercise")
}

// TODO(replay): decode the checked-in regression witness and run it deterministically.
#[test]
fn replay_saved_regression() {
    todo!("implement deterministic replay")
}

// TODO(metamorphic): state the precondition and test the transformed input.
#[test]
fn metamorphic_suffix_property() {
    todo!("implement the metamorphic relation")
}
`;

const readme = `# Property contracts workshop

This repository-authored Rust 2024 package is a bounded Proptest workshop. It
uses exactly \`proptest = 1.11.0\` as a development dependency and has no runtime
dependency. The library models two pure domains: Mini grep line selection and
Log Analyzer record classification.

## Verification

Run the following commands from this directory after fetching the locked
dependency graph:

    cargo fmt --all -- --check
    cargo test --locked
    cargo test replay_saved_regression --locked
    cargo clippy --all-targets --locked -- -D warnings

The starter test file contains TODOs for strategy composition, properties,
shrinking, replay, and the metamorphic relation. The solution test file
contains the completed bounded properties. The checked-in
\`proptest-regressions/property_contracts.txt\` file records the
repository-authored witness for the shrinking exercise. The replay test
decodes that witness and checks the summary contract deterministically. The
property tests generate at most 24 records or lines, 32 bytes of query and 40
bytes of message. The bounds describe the tested domain; they are not a proof
about every possible input.

The \`mutants/ignore-malformed-filter.rs\` and
\`mutants/keep-whitespace-message.rs\` fixtures are intentional, compiling
variants of the summary and parser contracts. A maintainer verifier swaps only
these repository-authored fixtures into temporary extracted archives and
confirms that the focused tests reject them. The application never executes learner code, imported files,
manifests, or local Cargo commands. Downloading the archive is not completion
evidence.

Property testing checks structured relations over a declared generator and
oracle. Fuzzing is a better fit for broad byte robustness and parser crash
discovery. Neither tool removes the need to state the contract, inspect a
counterexample, and describe uncovered cases.
`;

const regression = String.raw`# proptest regression file v1
# property-contracts/shrink-witness-v1
# The replay decoder consumes these repository-authored witness records.
# witness-line: 1 INFO startup
# witness-line: malformed
# witness-line: 2 ERROR retry
# witness-filter: ERROR
cc f540d0fd9da880cb0752886874c6c95def95c79a115f9f5aa8ee61c33a7b90e6 # persisted property witness
`;

const mutant = solutionLib.replace(
  `        let Ok(record) = parse_record(line) else {\n            summary.malformed += 1;\n            continue;\n        };`,
  `        let Ok(record) = parse_record(line) else {\n            if filter.is_none() {\n                summary.malformed += 1;\n            }\n            continue;\n        };`,
);

const parserMutant = solutionLib.replace(
  `        .map(str::trim)
        .filter(|value| !value.is_empty())`,
  `        .filter(|value| !value.is_empty())`,
);

export const propertyContractsFiles: ProjectPackage["files"] = [
  { path: "Cargo.toml", starter: manifest, solution: manifest },
  {
    path: "Cargo.lock",
    starter:
      '# This file is automatically @generated by Cargo.\n# It is not intended for manual editing.\n# Generated by Cargo during the author verification run.\nversion = 4\n\n[[package]]\nname = "autocfg"\nversion = "1.5.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f2032f911046de80f0a198e0901378627c33f59ea0ac00e363d481118bd70a53"\n\n[[package]]\nname = "bit-set"\nversion = "0.8.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "08807e080ed7f9d5433fa9b275196cfc35414f66a0c79d864dc51a0d825231a3"\ndependencies = [\n "bit-vec",\n]\n\n[[package]]\nname = "bit-vec"\nversion = "0.8.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "5e764a1d40d510daf35e07be9eb06e75770908c27d411ee6c92109c9840eaaf7"\n\n[[package]]\nname = "bitflags"\nversion = "2.13.2"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3ded4057c258ba199e2d26386d3af3780957ecaee6c4ef4041c6b4b8b97c0b06"\n\n[[package]]\nname = "cfg-if"\nversion = "1.0.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "4e7648175b45a9a48536d676f68d918270699102aa8dab5496df06904c914600"\n\n[[package]]\nname = "errno"\nversion = "0.3.14"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "39cab71617ae0d63f51a36d69f866391735b51691dbda63cf6f96d042b63efeb"\ndependencies = [\n "libc",\n "windows-sys",\n]\n\n[[package]]\nname = "fastrand"\nversion = "2.5.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "da7c62ceae207dd37ea5b845da6a0696c799f85e97da1ab5b7910be3c1c80223"\n\n[[package]]\nname = "fnv"\nversion = "1.0.7"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3f9eec918d3f24069decb9af1554cad7c880e2da24a9afd88aca000531ab82c1"\n\n[[package]]\nname = "getrandom"\nversion = "0.3.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "899def5c37c4fd7b2664648c28120ecec138e4d395b459e5ca34f9cce2dd77fd"\ndependencies = [\n "cfg-if",\n "libc",\n "r-efi 5.3.0",\n "wasip2",\n]\n\n[[package]]\nname = "getrandom"\nversion = "0.4.3"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "300e883d756b2e4ec94e02791f39b04b522276138852cfc41d9fb7e904106099"\ndependencies = [\n "cfg-if",\n "libc",\n "r-efi 6.0.0",\n]\n\n[[package]]\nname = "libc"\nversion = "0.2.189"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3eaf3ede3fee6db1a4c2ee091bf8a8b4dccdc6d17f656fb07896ee72867612f2"\n\n[[package]]\nname = "linux-raw-sys"\nversion = "0.12.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "32a66949e030da00e8c7d4434b251670a91556f4144941d37452769c25d58a53"\n\n[[package]]\nname = "num-traits"\nversion = "0.2.19"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "071dfc062690e90b734c0b2273ce72ad0ffa95f0c74596bc250dcfd960262841"\ndependencies = [\n "autocfg",\n]\n\n[[package]]\nname = "once_cell"\nversion = "1.21.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "9f7c3e4beb33f85d45ae3e3a1792185706c8e16d043238c593331cc7cd313b50"\n\n[[package]]\nname = "ppv-lite86"\nversion = "0.2.21"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "85eae3c4ed2f50dcfe72643da4befc30deadb458a9b590d720cde2f2b1e97da9"\ndependencies = [\n "zerocopy",\n]\n\n[[package]]\nname = "proc-macro2"\nversion = "1.0.107"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "985e7ec9bb745e6ce6535b544d84d6cd6f7ad8bd711c398938ae983b91a766d9"\ndependencies = [\n "unicode-ident",\n]\n\n[[package]]\nname = "property-contracts"\nversion = "1.0.0"\ndependencies = [\n "proptest",\n]\n\n[[package]]\nname = "proptest"\nversion = "1.11.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "4b45fcc2344c680f5025fe57779faef368840d0bd1f42f216291f0dc4ace4744"\ndependencies = [\n "bit-set",\n "bit-vec",\n "bitflags",\n "num-traits",\n "rand",\n "rand_chacha",\n "rand_xorshift",\n "regex-syntax",\n "rusty-fork",\n "tempfile",\n "unarray",\n]\n\n[[package]]\nname = "quick-error"\nversion = "1.2.3"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "a1d01941d82fa2ab50be1e79e6714289dd7cde78eba4c074bc5a4374f650dfe0"\n\n[[package]]\nname = "quote"\nversion = "1.0.47"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "1fbf4db142a473a8d80c26bbf18454ed458bf8d26c8219c331daecfdbd079001"\ndependencies = [\n "proc-macro2",\n]\n\n[[package]]\nname = "r-efi"\nversion = "5.3.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "69cdb34c158ceb288df11e18b4bd39de994f6657d83847bdffdbd7f346754b0f"\n\n[[package]]\nname = "r-efi"\nversion = "6.0.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f8dcc9c7d52a811697d2151c701e0d08956f92b0e24136cf4cf27b57a6a0d9bf"\n\n[[package]]\nname = "rand"\nversion = "0.9.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "b9ef1d0d795eb7d84685bca4f72f3649f064e6641543d3a8c415898726a57b41"\ndependencies = [\n "rand_chacha",\n "rand_core",\n]\n\n[[package]]\nname = "rand_chacha"\nversion = "0.9.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d3022b5f1df60f26e1ffddd6c66e8aa15de382ae63b3a0c1bfc0e4d3e3f325cb"\ndependencies = [\n "ppv-lite86",\n "rand_core",\n]\n\n[[package]]\nname = "rand_core"\nversion = "0.9.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "76afc826de14238e6e8c374ddcc1fa19e374fd8dd986b0d2af0d02377261d83c"\ndependencies = [\n "getrandom 0.3.4",\n]\n\n[[package]]\nname = "rand_xorshift"\nversion = "0.4.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "513962919efc330f829edb2535844d1b912b0fbe2ca165d613e4e8788bb05a5a"\ndependencies = [\n "rand_core",\n]\n\n[[package]]\nname = "regex-syntax"\nversion = "0.8.11"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d6f6ff9a378485b298a5286656da665ba74413d36db0979633275d2e708145d4"\n\n[[package]]\nname = "rustix"\nversion = "1.1.6"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "e5e76742e5294153d4dde1207dbec5bdd81eef6fabdc0d2118babadabfd858aa"\ndependencies = [\n "bitflags",\n "errno",\n "libc",\n "linux-raw-sys",\n "windows-sys",\n]\n\n[[package]]\nname = "rusty-fork"\nversion = "0.3.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "cc6bf79ff24e648f6da1f8d1f011e9cac26491b619e6b9280f2b47f1774e6ee2"\ndependencies = [\n "fnv",\n "quick-error",\n "tempfile",\n "wait-timeout",\n]\n\n[[package]]\nname = "syn"\nversion = "2.0.119"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "872831b642d1a07999a962a351ed35b955ea2cfc8f3862091e2a240a84f17297"\ndependencies = [\n "proc-macro2",\n "quote",\n "unicode-ident",\n]\n\n[[package]]\nname = "tempfile"\nversion = "3.27.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "32497e9a4c7b38532efcdebeef879707aa9f794296a4f0244f6f69e9bc8574bd"\ndependencies = [\n "fastrand",\n "getrandom 0.4.3",\n "once_cell",\n "rustix",\n "windows-sys",\n]\n\n[[package]]\nname = "unarray"\nversion = "0.1.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "eaea85b334db583fe3274d12b4cd1880032beab409c0d774be044d4480ab9a94"\n\n[[package]]\nname = "unicode-ident"\nversion = "1.0.26"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d245f478577f809a851594d02313b640fb437e0bb33866753cff937863096954"\n\n[[package]]\nname = "wait-timeout"\nversion = "0.2.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "09ac3b126d3914f9849036f826e054cbabdc8519970b8998ddaf3b5bd3c65f11"\ndependencies = [\n "libc",\n]\n\n[[package]]\nname = "wasip2"\nversion = "1.0.1+wasi-0.2.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "0562428422c63773dad2c345a1882263bbf4d65cf3f42e90921f787ef5ad58e7"\ndependencies = [\n "wit-bindgen",\n]\n\n[[package]]\nname = "windows-link"\nversion = "0.2.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f0805222e57f7521d6a62e36fa9163bc891acd422f971defe97d64e70d0a4fe5"\n\n[[package]]\nname = "windows-sys"\nversion = "0.61.2"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "ae137229bcbd6cdf0f7b80a31df61766145077ddf49416a728b02cb3921ff3fc"\ndependencies = [\n "windows-link",\n]\n\n[[package]]\nname = "wit-bindgen"\nversion = "0.46.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f17a85883d4e6d00e8a97c586de764dabcc06133f7f1d55dce5cdc070ad7fe59"\n\n[[package]]\nname = "zerocopy"\nversion = "0.8.57"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d35102a9f36d089ccae9e4c6802bc118be4487b80aaffc0ab4e0cf5ce92d2873"\ndependencies = [\n "zerocopy-derive",\n]\n\n[[package]]\nname = "zerocopy-derive"\nversion = "0.8.57"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "146c01f5ab44258da43cf276c74a2763db2ff3969c9c652c3f2de07041d0b2bc"\ndependencies = [\n "proc-macro2",\n "quote",\n "syn",\n]\n',
    solution:
      '# This file is automatically @generated by Cargo.\n# It is not intended for manual editing.\n# Generated by Cargo during the author verification run.\nversion = 4\n\n[[package]]\nname = "autocfg"\nversion = "1.5.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f2032f911046de80f0a198e0901378627c33f59ea0ac00e363d481118bd70a53"\n\n[[package]]\nname = "bit-set"\nversion = "0.8.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "08807e080ed7f9d5433fa9b275196cfc35414f66a0c79d864dc51a0d825231a3"\ndependencies = [\n "bit-vec",\n]\n\n[[package]]\nname = "bit-vec"\nversion = "0.8.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "5e764a1d40d510daf35e07be9eb06e75770908c27d411ee6c92109c9840eaaf7"\n\n[[package]]\nname = "bitflags"\nversion = "2.13.2"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3ded4057c258ba199e2d26386d3af3780957ecaee6c4ef4041c6b4b8b97c0b06"\n\n[[package]]\nname = "cfg-if"\nversion = "1.0.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "4e7648175b45a9a48536d676f68d918270699102aa8dab5496df06904c914600"\n\n[[package]]\nname = "errno"\nversion = "0.3.14"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "39cab71617ae0d63f51a36d69f866391735b51691dbda63cf6f96d042b63efeb"\ndependencies = [\n "libc",\n "windows-sys",\n]\n\n[[package]]\nname = "fastrand"\nversion = "2.5.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "da7c62ceae207dd37ea5b845da6a0696c799f85e97da1ab5b7910be3c1c80223"\n\n[[package]]\nname = "fnv"\nversion = "1.0.7"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3f9eec918d3f24069decb9af1554cad7c880e2da24a9afd88aca000531ab82c1"\n\n[[package]]\nname = "getrandom"\nversion = "0.3.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "899def5c37c4fd7b2664648c28120ecec138e4d395b459e5ca34f9cce2dd77fd"\ndependencies = [\n "cfg-if",\n "libc",\n "r-efi 5.3.0",\n "wasip2",\n]\n\n[[package]]\nname = "getrandom"\nversion = "0.4.3"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "300e883d756b2e4ec94e02791f39b04b522276138852cfc41d9fb7e904106099"\ndependencies = [\n "cfg-if",\n "libc",\n "r-efi 6.0.0",\n]\n\n[[package]]\nname = "libc"\nversion = "0.2.189"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "3eaf3ede3fee6db1a4c2ee091bf8a8b4dccdc6d17f656fb07896ee72867612f2"\n\n[[package]]\nname = "linux-raw-sys"\nversion = "0.12.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "32a66949e030da00e8c7d4434b251670a91556f4144941d37452769c25d58a53"\n\n[[package]]\nname = "num-traits"\nversion = "0.2.19"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "071dfc062690e90b734c0b2273ce72ad0ffa95f0c74596bc250dcfd960262841"\ndependencies = [\n "autocfg",\n]\n\n[[package]]\nname = "once_cell"\nversion = "1.21.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "9f7c3e4beb33f85d45ae3e3a1792185706c8e16d043238c593331cc7cd313b50"\n\n[[package]]\nname = "ppv-lite86"\nversion = "0.2.21"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "85eae3c4ed2f50dcfe72643da4befc30deadb458a9b590d720cde2f2b1e97da9"\ndependencies = [\n "zerocopy",\n]\n\n[[package]]\nname = "proc-macro2"\nversion = "1.0.107"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "985e7ec9bb745e6ce6535b544d84d6cd6f7ad8bd711c398938ae983b91a766d9"\ndependencies = [\n "unicode-ident",\n]\n\n[[package]]\nname = "property-contracts"\nversion = "1.0.0"\ndependencies = [\n "proptest",\n]\n\n[[package]]\nname = "proptest"\nversion = "1.11.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "4b45fcc2344c680f5025fe57779faef368840d0bd1f42f216291f0dc4ace4744"\ndependencies = [\n "bit-set",\n "bit-vec",\n "bitflags",\n "num-traits",\n "rand",\n "rand_chacha",\n "rand_xorshift",\n "regex-syntax",\n "rusty-fork",\n "tempfile",\n "unarray",\n]\n\n[[package]]\nname = "quick-error"\nversion = "1.2.3"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "a1d01941d82fa2ab50be1e79e6714289dd7cde78eba4c074bc5a4374f650dfe0"\n\n[[package]]\nname = "quote"\nversion = "1.0.47"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "1fbf4db142a473a8d80c26bbf18454ed458bf8d26c8219c331daecfdbd079001"\ndependencies = [\n "proc-macro2",\n]\n\n[[package]]\nname = "r-efi"\nversion = "5.3.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "69cdb34c158ceb288df11e18b4bd39de994f6657d83847bdffdbd7f346754b0f"\n\n[[package]]\nname = "r-efi"\nversion = "6.0.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f8dcc9c7d52a811697d2151c701e0d08956f92b0e24136cf4cf27b57a6a0d9bf"\n\n[[package]]\nname = "rand"\nversion = "0.9.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "b9ef1d0d795eb7d84685bca4f72f3649f064e6641543d3a8c415898726a57b41"\ndependencies = [\n "rand_chacha",\n "rand_core",\n]\n\n[[package]]\nname = "rand_chacha"\nversion = "0.9.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d3022b5f1df60f26e1ffddd6c66e8aa15de382ae63b3a0c1bfc0e4d3e3f325cb"\ndependencies = [\n "ppv-lite86",\n "rand_core",\n]\n\n[[package]]\nname = "rand_core"\nversion = "0.9.5"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "76afc826de14238e6e8c374ddcc1fa19e374fd8dd986b0d2af0d02377261d83c"\ndependencies = [\n "getrandom 0.3.4",\n]\n\n[[package]]\nname = "rand_xorshift"\nversion = "0.4.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "513962919efc330f829edb2535844d1b912b0fbe2ca165d613e4e8788bb05a5a"\ndependencies = [\n "rand_core",\n]\n\n[[package]]\nname = "regex-syntax"\nversion = "0.8.11"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d6f6ff9a378485b298a5286656da665ba74413d36db0979633275d2e708145d4"\n\n[[package]]\nname = "rustix"\nversion = "1.1.6"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "e5e76742e5294153d4dde1207dbec5bdd81eef6fabdc0d2118babadabfd858aa"\ndependencies = [\n "bitflags",\n "errno",\n "libc",\n "linux-raw-sys",\n "windows-sys",\n]\n\n[[package]]\nname = "rusty-fork"\nversion = "0.3.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "cc6bf79ff24e648f6da1f8d1f011e9cac26491b619e6b9280f2b47f1774e6ee2"\ndependencies = [\n "fnv",\n "quick-error",\n "tempfile",\n "wait-timeout",\n]\n\n[[package]]\nname = "syn"\nversion = "2.0.119"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "872831b642d1a07999a962a351ed35b955ea2cfc8f3862091e2a240a84f17297"\ndependencies = [\n "proc-macro2",\n "quote",\n "unicode-ident",\n]\n\n[[package]]\nname = "tempfile"\nversion = "3.27.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "32497e9a4c7b38532efcdebeef879707aa9f794296a4f0244f6f69e9bc8574bd"\ndependencies = [\n "fastrand",\n "getrandom 0.4.3",\n "once_cell",\n "rustix",\n "windows-sys",\n]\n\n[[package]]\nname = "unarray"\nversion = "0.1.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "eaea85b334db583fe3274d12b4cd1880032beab409c0d774be044d4480ab9a94"\n\n[[package]]\nname = "unicode-ident"\nversion = "1.0.26"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d245f478577f809a851594d02313b640fb437e0bb33866753cff937863096954"\n\n[[package]]\nname = "wait-timeout"\nversion = "0.2.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "09ac3b126d3914f9849036f826e054cbabdc8519970b8998ddaf3b5bd3c65f11"\ndependencies = [\n "libc",\n]\n\n[[package]]\nname = "wasip2"\nversion = "1.0.1+wasi-0.2.4"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "0562428422c63773dad2c345a1882263bbf4d65cf3f42e90921f787ef5ad58e7"\ndependencies = [\n "wit-bindgen",\n]\n\n[[package]]\nname = "windows-link"\nversion = "0.2.1"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f0805222e57f7521d6a62e36fa9163bc891acd422f971defe97d64e70d0a4fe5"\n\n[[package]]\nname = "windows-sys"\nversion = "0.61.2"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "ae137229bcbd6cdf0f7b80a31df61766145077ddf49416a728b02cb3921ff3fc"\ndependencies = [\n "windows-link",\n]\n\n[[package]]\nname = "wit-bindgen"\nversion = "0.46.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "f17a85883d4e6d00e8a97c586de764dabcc06133f7f1d55dce5cdc070ad7fe59"\n\n[[package]]\nname = "zerocopy"\nversion = "0.8.57"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "d35102a9f36d089ccae9e4c6802bc118be4487b80aaffc0ab4e0cf5ce92d2873"\ndependencies = [\n "zerocopy-derive",\n]\n\n[[package]]\nname = "zerocopy-derive"\nversion = "0.8.57"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "146c01f5ab44258da43cf276c74a2763db2ff3969c9c652c3f2de07041d0b2bc"\ndependencies = [\n "proc-macro2",\n "quote",\n "syn",\n]\n',
  },
  { path: "README.md", starter: readme, solution: readme },
  { path: "src/lib.rs", starter: starterLib, solution: solutionLib },
  {
    path: "tests/property_contracts.rs",
    starter: starterTests,
    solution: propertyTests,
  },
  {
    path: "proptest-regressions/property_contracts.txt",
    starter: regression,
    solution: regression,
  },
  {
    path: "mutants/ignore-malformed-filter.rs",
    starter: mutant,
    solution: mutant,
  },
  {
    path: "mutants/keep-whitespace-message.rs",
    starter: parserMutant,
    solution: parserMutant,
  },
];
