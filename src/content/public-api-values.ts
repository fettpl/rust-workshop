import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const publicApiValueSources: Source[] = [
  {
    id: "public-api-try-from",
    title: "Rust standard library: TryFrom",
    url: "https://doc.rust-lang.org/std/convert/trait.TryFrom.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktów konwersji fallible albo zalecenia implementowania TryFrom przez autorów bibliotek.",
  },
  {
    id: "public-api-string-from-utf8",
    title: "Rust standard library: String::from_utf8",
    url: "https://doc.rust-lang.org/std/string/struct.String.html#method.from_utf8",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki konwersji Vec<u8> do UTF-8 String albo typu FromUtf8Error.",
  },
  {
    id: "public-api-error-source",
    title: "Rust standard library: Error::source i downcast_ref",
    url: "https://doc.rust-lang.org/std/error/trait.Error.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu Error::source, downcast_ref albo łańcucha przyczyn błędów.",
  },
  {
    id: "public-api-io-error-inner",
    title: "Rust standard library: io::Error::get_ref",
    url: "https://doc.rust-lang.org/std/io/struct.Error.html#method.get_ref",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie dostępu do błędu przechowanego wewnątrz io::Error albo testów zachowania jego typu.",
  },
];

export const publicApiValueCompetencies: Competency[] = [
  {
    id: "public-api-validated-opaque-values",
    title:
      "Projektujesz nieprzezroczystą wartość publiczną z walidacją na granicy, fallible konwersjami i stabilnymi accessorami.",
  },
  {
    id: "public-api-preserved-error-causes",
    title:
      "Zwracasz błąd publiczny z etapem operacji i zachowaną, typowaną przyczyną dostępną przez Error::source.",
  },
];

export const publicApiValueConcepts: Concept[] = [
  {
    id: "api-validated-construction",
    title: "Walidowana, nieprzezroczysta wartość publiczna",
    prerequisites: ["tokio-admission-permit-lifetime"],
    competencyIds: ["public-api-validated-opaque-values"],
    reviewPrompt:
      "Dlaczego klient powinien otrzymać TryFrom i as_str zamiast publicznego pola String w wartości z ograniczeniami?",
    reviewAnswer:
      "TryFrom wymusza sprawdzenie każdej konstrukcji, a prywatna reprezentacja pozwala bibliotece zmienić środek bez zmiany sposobu odczytu przez klienta; as_str pożycza poprawną wartość bez odbierania własności.",
    distinguish:
      "String gwarantuje UTF-8, lecz nie gwarantuje reguł domeny takich jak niepustość lub maksymalna liczba bajtów. Display może pokazać wartość człowiekowi, ale accessor jest stabilnym kontraktem danych dla klienta.",
  },
  {
    id: "api-error-source-chain",
    title: "Błąd publiczny z zachowanym łańcuchem przyczyn",
    prerequisites: ["api-validated-construction"],
    competencyIds: ["public-api-preserved-error-causes"],
    reviewPrompt:
      "Jak sprawdzasz maszynowo etap błędu I/O i oryginalną przyczynę, nie parsując tekstu Display?",
    reviewAnswer:
      "Klient odczytuje typowany etap i ErrorKind przez accessory, następnie pobiera Error::source, downcast_ref::<io::Error> i jego własne source. Display jest opisem dla człowieka, więc nie jest parserem kontraktu.",
    distinguish:
      "Nowy io::Error z tym samym ErrorKind zachowuje tylko kategorię, ale niszczy pierwotny obiekt i jego source. Własny błąd powinien dodać kontekst etapu, zachowując przekazany io::Error jako przyczynę.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: string,
  choices: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: choices.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}

function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function exercise(options: {
  id: string;
  kind: "debug" | "apply" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
  forbiddenPatterns?: string[];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: {
      kind: "tests",
      tests: options.tests,
      ...(options.forbiddenPatterns
        ? { forbiddenPatterns: options.forbiddenPatterns }
        : {}),
    },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const validatedConstructionRun = `fn main() {
    let valid = String::from_utf8(vec![b'a', b'p', b'i']);
    let invalid = String::from_utf8(vec![0xff]);
    println!("{} {}", valid.is_ok(), invalid.is_ok());
}`;

const validatedConstructionGateStarter = `use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq)]
pub enum ChannelNameError {
    Empty,
    TooLong { actual: usize, maximum: usize },
    InvalidUtf8,
}

pub struct ChannelName(String);

impl ChannelName {
    pub const MAX_BYTES: usize = 24;

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        todo!("sprawdź pustą wartość i liczbę bajtów")
    }
}

impl TryFrom<&str> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        ChannelName::try_from(value.to_owned())
    }
}

impl TryFrom<Vec<u8>> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        let text = String::from_utf8(value).map_err(|_| ChannelNameError::InvalidUtf8)?;
        ChannelName::try_from(text)
    }
}`;

const validatedConstructionGateTests = `use std::convert::TryFrom;

#[test]
fn validates_boundaries_utf8_ownership_and_reusable_borrows() {
    assert!(matches!(
        ChannelName::try_from(String::new()),
        Err(ChannelNameError::Empty),
    ));

    let maximum = "x".repeat(ChannelName::MAX_BYTES);
    let name = ChannelName::try_from(maximum.clone()).unwrap();
    assert_eq!(name.as_str(), maximum);
    assert_eq!(name.as_str(), "x".repeat(ChannelName::MAX_BYTES));
    assert_eq!(name.into_inner(), "x".repeat(ChannelName::MAX_BYTES));

    let multibyte_boundary = "ż".repeat(ChannelName::MAX_BYTES / 2);
    assert_eq!(multibyte_boundary.len(), ChannelName::MAX_BYTES);
    assert_eq!(
        ChannelName::try_from(multibyte_boundary.clone())
            .unwrap()
            .as_str(),
        multibyte_boundary,
    );
    let multibyte_over_limit = "ż".repeat(ChannelName::MAX_BYTES / 2 + 1);
    assert_eq!(multibyte_over_limit.len(), ChannelName::MAX_BYTES + 2);
    assert!(matches!(
        ChannelName::try_from(multibyte_over_limit),
        Err(ChannelNameError::TooLong { actual, maximum })
            if actual == ChannelName::MAX_BYTES + 2 && maximum == ChannelName::MAX_BYTES,
    ));

    assert!(matches!(
        ChannelName::try_from("y".repeat(ChannelName::MAX_BYTES + 1)),
        Err(ChannelNameError::TooLong {
            actual,
            maximum,
        }) if actual == ChannelName::MAX_BYTES + 1 && maximum == ChannelName::MAX_BYTES,
    ));
    assert!(matches!(
        ChannelName::try_from(vec![0xff]),
        Err(ChannelNameError::InvalidUtf8),
    ));

    let reusable = String::from("żółć");
    let first = ChannelName::try_from(reusable.as_str()).unwrap();
    let second = ChannelName::try_from(reusable.as_str()).unwrap();
    assert_eq!(reusable, "żółć");
    assert_eq!(first.as_str(), second.as_str());
}`;

const validatedConstructionBlankTests = `use std::convert::TryFrom;

#[test]
fn api_keys_validate_every_boundary_and_preserve_borrowed_input() {
    let key = ApiKey::try_from("abcd-1234").unwrap();
    assert_eq!(key.as_str(), "abcd-1234");
    assert_eq!(key.into_inner(), "abcd-1234");

    assert!(matches!(ApiKey::try_from(""), Err(ApiKeyError::Empty)));
    let too_long = "a".repeat(ApiKey::MAX_BYTES + 1);
    assert!(matches!(
        ApiKey::try_from(too_long.as_str()),
        Err(ApiKeyError::TooLong {
            actual,
            maximum,
        }) if actual == ApiKey::MAX_BYTES + 1 && maximum == ApiKey::MAX_BYTES,
    ));
    assert!(matches!(
        ApiKey::try_from("abcd_1234"),
        Err(ApiKeyError::InvalidCharacter { character: '_' }),
    ));

    let reusable = String::from("ABC-99");
    let first = ApiKey::try_from(reusable.as_str()).unwrap();
    let second = ApiKey::try_from(reusable.as_str()).unwrap();
    assert_eq!(reusable, "ABC-99");
    assert_eq!(first.as_str(), second.as_str());
}`;

const validatedConstructionReviewStarter = `use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq)]
pub enum SegmentError {
    Empty,
    TooLong { actual: usize, maximum: usize },
    InvalidUtf8,
}

pub struct Segment(String);

impl Segment {
    pub const MAX_BYTES: usize = 12;

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<Vec<u8>> for Segment {
    type Error = SegmentError;

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        todo!("utwórz Segment dopiero po UTF-8 i walidacji domeny")
    }
}`;

const validatedConstructionReviewTests = `use std::convert::TryFrom;

#[test]
fn segment_review_requires_utf8_and_domain_validation() {
    let boundary = vec![b'z'; Segment::MAX_BYTES];
    assert_eq!(Segment::try_from(boundary).unwrap().as_str(), "z".repeat(Segment::MAX_BYTES));
    assert!(matches!(Segment::try_from(Vec::new()), Err(SegmentError::Empty)));
    assert!(matches!(
        Segment::try_from(vec![b'z'; Segment::MAX_BYTES + 1]),
        Err(SegmentError::TooLong {
            actual,
            maximum,
        }) if actual == Segment::MAX_BYTES + 1 && maximum == Segment::MAX_BYTES,
    ));
    assert!(matches!(Segment::try_from(vec![0xff]), Err(SegmentError::InvalidUtf8)));
}`;

const errorSourceRun = `use std::error::Error;
use std::io;

#[derive(Debug)]
struct LoadingError { source: io::Error }

impl std::fmt::Display for LoadingError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "cannot load header")
    }
}

impl Error for LoadingError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

fn main() {
    let error = LoadingError { source: io::Error::from(io::ErrorKind::NotFound) };
    println!("{} {}", error, error.source().unwrap().is::<io::Error>());
}`;

const errorSourceGateStarter = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrameReadStage { Tag }

#[derive(Debug)]
pub struct FrameReadError {
    stage: FrameReadStage,
    source: io::Error,
}

impl FrameReadError {
    pub fn stage(&self) -> FrameReadStage { self.stage }
    pub fn kind(&self) -> io::ErrorKind { self.source.kind() }
}

impl fmt::Display for FrameReadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot read frame tag")
    }
}

impl Error for FrameReadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

pub fn read_tag<R: Read>(_reader: &mut R) -> Result<u8, FrameReadError> {
    todo!("dodaj etap, zachowaj przekazany io::Error i przeczytaj dokładnie jeden bajt")
}`;

const errorSourceGateTests = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug)]
struct OriginalMarker;

impl fmt::Display for OriginalMarker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "original marker")
    }
}

impl Error for OriginalMarker {}

struct FailingReader;

impl Read for FailingReader {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(io::ErrorKind::PermissionDenied, OriginalMarker))
    }
}

#[test]
fn preserves_stage_kind_and_the_original_typed_error_chain() {
    let error = read_tag(&mut FailingReader).unwrap_err();
    assert_eq!(error.stage(), FrameReadStage::Tag);
    assert_eq!(error.kind(), io::ErrorKind::PermissionDenied);
    assert_eq!(error.to_string(), "cannot read frame tag");

    let source = error.source().expect("public Error must retain source");
    let io_error = source.downcast_ref::<io::Error>().expect("source is the original io::Error");
    assert_eq!(io_error.kind(), io::ErrorKind::PermissionDenied);
    assert!(io_error.get_ref().and_then(|cause| cause.downcast_ref::<OriginalMarker>()).is_some());
}

#[test]
fn successful_read_has_no_error_to_format_or_parse() {
    let mut input = io::Cursor::new(vec![0x2a]);
    assert_eq!(read_tag(&mut input).unwrap(), 0x2a);
}`;

const errorSourceBlankTests = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug)]
struct DiscriminatorMarker;
impl fmt::Display for DiscriminatorMarker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "discriminator marker")
    }
}
impl Error for DiscriminatorMarker {}

#[derive(Debug)]
struct LengthMarker;
impl fmt::Display for LengthMarker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "length marker")
    }
}
impl Error for LengthMarker {}

struct FailingDiscriminator;
impl Read for FailingDiscriminator {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(io::ErrorKind::InvalidData, DiscriminatorMarker))
    }
}

struct FailingLength { sent_discriminator: bool }
impl Read for FailingLength {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        if !self.sent_discriminator {
            self.sent_discriminator = true;
            buffer[0] = 0xa1;
            Ok(1)
        } else {
            Err(io::Error::new(io::ErrorKind::UnexpectedEof, LengthMarker))
        }
    }
}

#[test]
fn prefix_preserves_the_discriminator_failure_stage_and_marker() {
    let error = read_prefix(&mut FailingDiscriminator).unwrap_err();
    assert_eq!(error.stage(), PrefixStage::Discriminator);
    assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    let source = error.source().expect("cause exists");
    let io_error = source.downcast_ref::<io::Error>().expect("io source exists");
    assert!(io_error.get_ref().and_then(|cause| cause.downcast_ref::<DiscriminatorMarker>()).is_some());
}

#[test]
fn prefix_preserves_the_length_failure_stage_and_marker() {
    let mut reader = FailingLength { sent_discriminator: false };
    let error = read_prefix(&mut reader).unwrap_err();
    assert_eq!(error.stage(), PrefixStage::Length);
    assert_eq!(error.kind(), io::ErrorKind::UnexpectedEof);
    let source = error.source().expect("cause exists");
    let io_error = source.downcast_ref::<io::Error>().expect("io source exists");
    assert!(io_error.get_ref().and_then(|cause| cause.downcast_ref::<LengthMarker>()).is_some());
}

#[test]
fn prefix_reads_discriminator_and_big_endian_length_on_success() {
    let mut input = io::Cursor::new(vec![0xa1, 0x01, 0x02]);
    assert_eq!(read_prefix(&mut input).unwrap(), (0xa1, 258));
}`;

const errorSourceReviewStarter = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrefixStage { Version }

#[derive(Debug)]
pub struct PrefixError {
    stage: PrefixStage,
    source: io::Error,
}

impl PrefixError {
    pub fn stage(&self) -> PrefixStage { self.stage }
    pub fn kind(&self) -> io::ErrorKind { self.source.kind() }
}

impl fmt::Display for PrefixError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot read protocol version")
    }
}

impl Error for PrefixError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

pub fn read_version<R: Read>(_reader: &mut R) -> Result<u8, PrefixError> {
    todo!("przeczytaj wersję i nie zastępuj źródła nowym błędem")
}`;

const errorSourceReviewTests = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug)]
struct VersionMarker;
impl fmt::Display for VersionMarker {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result { write!(formatter, "version marker") }
}
impl Error for VersionMarker {}

struct BrokenVersion;
impl Read for BrokenVersion {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(io::ErrorKind::ConnectionReset, VersionMarker))
    }
}

#[test]
fn fresh_review_keeps_version_context_and_original_cause() {
    let error = read_version(&mut BrokenVersion).unwrap_err();
    assert_eq!(error.stage(), PrefixStage::Version);
    assert_eq!(error.kind(), io::ErrorKind::ConnectionReset);
    let source = error.source().expect("source exists");
    let io_error = source.downcast_ref::<io::Error>().expect("io source exists");
    assert!(io_error.get_ref().and_then(|cause| cause.downcast_ref::<VersionMarker>()).is_some());
}

#[test]
fn fresh_review_reads_a_version() {
    let mut input = io::Cursor::new(vec![7]);
    assert_eq!(read_version(&mut input).unwrap(), 7);
}`;

const validatedConstructionGateSolution = `use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq)]
pub enum ChannelNameError {
    Empty,
    TooLong { actual: usize, maximum: usize },
    InvalidUtf8,
}

pub struct ChannelName(String);

impl ChannelName {
    pub const MAX_BYTES: usize = 24;

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<String> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value.is_empty() {
            return Err(ChannelNameError::Empty);
        }
        let actual = value.len();
        if actual > Self::MAX_BYTES {
            return Err(ChannelNameError::TooLong {
                actual,
                maximum: Self::MAX_BYTES,
            });
        }
        Ok(Self(value))
    }
}

impl TryFrom<&str> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::try_from(value.to_owned())
    }
}

impl TryFrom<Vec<u8>> for ChannelName {
    type Error = ChannelNameError;

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        let text = String::from_utf8(value).map_err(|_| ChannelNameError::InvalidUtf8)?;
        Self::try_from(text)
    }
}`;

const validatedConstructionBlankSolution = `use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq)]
pub enum ApiKeyError {
    Empty,
    TooLong { actual: usize, maximum: usize },
    InvalidCharacter { character: char },
}

pub struct ApiKey(String);

impl ApiKey {
    pub const MAX_BYTES: usize = 16;

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

impl TryFrom<&str> for ApiKey {
    type Error = ApiKeyError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        if value.is_empty() {
            return Err(ApiKeyError::Empty);
        }
        let actual = value.len();
        if actual > Self::MAX_BYTES {
            return Err(ApiKeyError::TooLong {
                actual,
                maximum: Self::MAX_BYTES,
            });
        }
        if let Some(character) = value
            .chars()
            .find(|character| !character.is_ascii_alphanumeric() && *character != '-')
        {
            return Err(ApiKeyError::InvalidCharacter { character });
        }
        Ok(Self(value.to_owned()))
    }
}`;

const validatedConstructionReviewSolution = `use std::convert::TryFrom;

#[derive(Debug, PartialEq, Eq)]
pub enum SegmentError {
    Empty,
    TooLong { actual: usize, maximum: usize },
    InvalidUtf8,
}

pub struct Segment(String);

impl Segment {
    pub const MAX_BYTES: usize = 12;

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<Vec<u8>> for Segment {
    type Error = SegmentError;

    fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
        let text = String::from_utf8(value).map_err(|_| SegmentError::InvalidUtf8)?;
        if text.is_empty() {
            return Err(SegmentError::Empty);
        }
        let actual = text.len();
        if actual > Self::MAX_BYTES {
            return Err(SegmentError::TooLong {
                actual,
                maximum: Self::MAX_BYTES,
            });
        }
        Ok(Self(text))
    }
}`;

const errorSourceGateSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrameReadStage { Tag }

#[derive(Debug)]
pub struct FrameReadError {
    stage: FrameReadStage,
    source: io::Error,
}

impl FrameReadError {
    pub fn stage(&self) -> FrameReadStage { self.stage }
    pub fn kind(&self) -> io::ErrorKind { self.source.kind() }
}

impl fmt::Display for FrameReadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot read frame tag")
    }
}

impl Error for FrameReadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

pub fn read_tag<R: Read>(reader: &mut R) -> Result<u8, FrameReadError> {
    let mut byte = [0; 1];
    reader.read_exact(&mut byte).map_err(|source| FrameReadError {
        stage: FrameReadStage::Tag,
        source,
    })?;
    Ok(byte[0])
}`;

const errorSourceBlankSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrefixStage { Discriminator, Length }

#[derive(Debug)]
pub struct PrefixError {
    stage: PrefixStage,
    source: io::Error,
}

impl PrefixError {
    pub fn stage(&self) -> PrefixStage { self.stage }
    pub fn kind(&self) -> io::ErrorKind { self.source.kind() }
}

impl fmt::Display for PrefixError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot read frame prefix")
    }
}

impl Error for PrefixError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

pub fn read_prefix<R: Read>(reader: &mut R) -> Result<(u8, u16), PrefixError> {
    let mut discriminator = [0; 1];
    reader.read_exact(&mut discriminator).map_err(|source| PrefixError {
        stage: PrefixStage::Discriminator,
        source,
    })?;
    let mut length = [0; 2];
    reader.read_exact(&mut length).map_err(|source| PrefixError {
        stage: PrefixStage::Length,
        source,
    })?;
    Ok((discriminator[0], u16::from_be_bytes(length)))
}`;

const errorSourceReviewSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, Read};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrefixStage { Version }

#[derive(Debug)]
pub struct PrefixError {
    stage: PrefixStage,
    source: io::Error,
}

impl PrefixError {
    pub fn stage(&self) -> PrefixStage { self.stage }
    pub fn kind(&self) -> io::ErrorKind { self.source.kind() }
}

impl fmt::Display for PrefixError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot read protocol version")
    }
}

impl Error for PrefixError {
    fn source(&self) -> Option<&(dyn Error + 'static)> { Some(&self.source) }
}

pub fn read_version<R: Read>(reader: &mut R) -> Result<u8, PrefixError> {
    let mut byte = [0; 1];
    reader.read_exact(&mut byte).map_err(|source| PrefixError {
        stage: PrefixStage::Version,
        source,
    })?;
    Ok(byte[0])
}`;

export const publicApiValueLessons: Lesson[] = [
  {
    id: "api-validated-construction",
    moduleId: "public-api-workspaces",
    conceptIds: ["api-validated-construction"],
    competencyIds: ["public-api-validated-opaque-values"],
    prerequisites: ["tokio-admission-lifecycle"],
    title: "Wartość publiczna powstaje tylko po walidacji",
    subtitle:
      "Zamkniesz reprezentację, przyjmiesz dane przez TryFrom i oddasz klientowi stabilny dostęp bez kopiowania.",
    minutes: 28,
    outcomes: [
      "Odróżnisz gwarancję UTF-8 od reguł domeny wartości.",
      "Zbudujesz nieprzezroczysty typ przez fallible konwersje String, &str i Vec<u8>.",
      "Udostępnisz pożyczający accessor i świadome przejęcie własności bez publicznego pola.",
    ],
    steps: [
      choose(
        "api-validated-construction-predict",
        "predict",
        "Czy String wystarcza za kontrakt?",
        "API przyjmuje nazwę kanału jako String. Czy samo String gwarantuje, że nazwa jest niepusta i ma najwyżej 24 bajty?",
        "2",
        [
          "Tak, bo String jest już poprawnym tekstem UTF-8.",
          "Tak, gdy pole String jest publiczne.",
          "Nie; UTF-8 i reguły domeny są różnymi kontraktami.",
        ],
        [
          "UTF-8 nie mówi nic o pustym tekście ani limicie długości domeny.",
          "Publiczne pole pozwala ominąć konstrukcję i późniejszą walidację.",
          "Tak. Wartość domenowa musi odrzucić dane, które są tekstem, lecz nie spełniają jej reguł.",
        ],
      ),
      run(
        "api-validated-construction-run",
        "Sprawdź granicę UTF-8",
        "Uruchom kontrast. Vec<u8> może zawierać dowolne bajty, a String::from_utf8 dopiero ustala, czy może z nich powstać String. Następny krok doda osobno niepustość i limit kanału.",
        validatedConstructionRun,
        "true false\n",
      ),
      choose(
        "api-validated-construction-accessor",
        "explain",
        "Które API zachowuje granicę?",
        "Klient ma wielokrotnie odczytać poprawną nazwę, a biblioteka może kiedyś zmienić jej wewnętrzne przechowanie. Który publiczny kształt jest właściwy?",
        "0",
        [
          "pub struct ChannelName(String) z prywatnym polem, TryFrom i as_str(&self) -> &str",
          "pub struct ChannelName { pub text: String }, aby każdy zmieniał tekst bezpośrednio",
          "pub type ChannelName = String, a walidacja tylko w dokumentacji",
        ],
        [
          "TryFrom skupia tworzenie na granicy, a accessor pożycza wartość bez wiązania klientów z reprezentacją.",
          "Każda zmiana publicznego pola omijałaby walidację po konstrukcji.",
          "Alias nie może odróżnić poprawnej nazwy kanału od dowolnego String.",
        ],
      ),
      exercise({
        id: "api-validated-construction-gate",
        kind: "debug",
        title: "Napraw konstrukcję kanału",
        prompt:
          "Uzupełnij TryFrom<String> dla nieprzezroczystego ChannelName. Pusta wartość ma dać Empty; wartość dłuższa niż MAX_BYTES ma podać actual i maximum; poprawna ma przejąć String bez klonowania. Gotowe konwersje z &str i Vec<u8> mają ponownie użyć tej jednej granicy: &str pozostawia własność po stronie klienta, a Vec<u8> musi odrzucić błędne UTF-8. Nie dodawaj publicznego pola ani nie polegaj na Display do odczytu danych.",
        code: validatedConstructionGateStarter,
        solution: validatedConstructionGateSolution,
        tests: validatedConstructionGateTests,
        hints: [
          "Sprawdź value.is_empty(), a potem value.len() przed utworzeniem Self(value).",
          "W Err TooLong zachowaj obserwowaną liczbę bajtów oraz ChannelName::MAX_BYTES.",
        ],
        gate: true,
        forbiddenPatterns: ["unsafe", "unwrap(", "expect("],
      }),
      exercise({
        id: "api-validated-construction-blank",
        kind: "blank",
        title: "Od pustej kartki: klucz API",
        prompt:
          "Od pustej kartki zbuduj publiczne ApiKey i ApiKeyError. Reprezentacja String ma być prywatna. Udostępnij MAX_BYTES = 16, as_str, into_inner oraz TryFrom<&str>. Pusta wartość daje Empty; tekst dłuższy niż limit daje TooLong { actual, maximum }; znaki inne niż ASCII alfanumeryczne lub '-' dają InvalidCharacter { character }. &str ma być pożyczony, więc ten sam String klienta można przetworzyć wielokrotnie. Nie dodawaj main, Clone, publicznych pól ani parsera opisu błędu.",
        solution: validatedConstructionBlankSolution,
        tests: validatedConstructionBlankTests,
        hints: [
          "W iteracji po chars użyj is_ascii_alphanumeric() || character == '-'.",
          "Najpierw sprawdź pustkę i liczbę bajtów, potem pierwszy niedozwolony znak; na końcu przechowaj value.to_owned().",
        ],
        gate: true,
        forbiddenPatterns: ["unsafe", "unwrap(", "expect("],
      }),
      choose(
        "api-validated-construction-recall",
        "recall",
        "Odtwórz granicę własności",
        "Która konwersja jest właściwa, gdy klient chce zachować swój String i utworzyć dwa niezależne ChannelName?",
        "1",
        [
          "TryFrom<String>, bo zawsze odbiera własność wejścia.",
          "TryFrom<&str>, bo może pożyczyć tekst i utworzyć własne przechowanie po walidacji.",
          "Publiczne pole, bo nie wymaga żadnej konwersji.",
        ],
        [
          "Ta droga jest dobra, gdy biblioteka ma przejąć istniejący String, lecz po wywołaniu klient go nie posiada.",
          "Tak. Wartość domenowa kopiuje tylko wtedy, gdy jej własna reprezentacja musi posiadać tekst, a wejście klienta zostaje używalne.",
          "To omija warunek konstrukcji i wiąże API z reprezentacją.",
        ],
      ),
    ],
    misconceptions: [
      "Poprawne UTF-8 automatycznie spełnia reguły biznesowe.",
      "Publiczne pole jest równie bezpieczne jak walidowana konstrukcja.",
      "Accessor &str przenosi String albo wymaga Clone od klienta.",
    ],
    transferTask:
      "Zaprojektuj identyfikator zasobu o limicie bajtów i zakazanych znakach. Wskaż wejścia TryFrom, warianty błędów, accessor dla klienta oraz które wejście zostaje własnością klienta.",
    evidenceGate:
      "api-validated-construction-gate sprawdza pustkę, granicę oraz przekroczenie także wielobajtowym `ż`, UTF-8, przejęcie String i wielokrotne pożyczenie &str. Niezależny blank api-validated-construction-blank używa nowej domeny ApiKey. Powtórka review-api-validated-construction sprawdza osobny Segment z Vec<u8>. Te fixture działają w jednej crate, więc sprawdzają zachowanie konstrukcji i accessorów, ale nie dowodzą prywatności pola wobec zewnętrznego klienta; to wymaga testu w osobnej crate workspace.",
    sourceIds: ["public-api-try-from", "public-api-string-from-utf8"],
  },
  {
    id: "api-error-source-chain",
    moduleId: "public-api-workspaces",
    conceptIds: ["api-error-source-chain"],
    competencyIds: ["public-api-preserved-error-causes"],
    prerequisites: ["api-validated-construction"],
    title: "Kontekst błędu nie może zgubić przyczyny",
    subtitle:
      "Dodasz etap publicznego API, zachowasz oryginalny io::Error i sprawdzisz łańcuch przez typy zamiast tekstu.",
    minutes: 30,
    outcomes: [
      "Dodasz maszynowo czytelny etap i ErrorKind do błędu publicznego.",
      "Zaimplementujesz Error::source bez zastępowania przekazanego io::Error.",
      "Zweryfikujesz oryginalną przyczynę przez downcast_ref, a nie przez Display.",
    ],
    steps: [
      choose(
        "api-error-source-chain-predict",
        "predict",
        "Czy sam ErrorKind zachowuje przyczynę?",
        "Masz io::Error z ErrorKind::PermissionDenied i własnym błędem źródłowym. Czy utworzenie nowego io::Error z tym samym kind zachowuje cały łańcuch?",
        "2",
        [
          "Tak, bo ErrorKind zawiera cały pierwotny błąd.",
          "Tak, jeśli nowy Display zawiera poprzedni komunikat.",
          "Nie; zachowuje kategorię, ale gubi oryginalny obiekt i jego source.",
        ],
        [
          "ErrorKind to klasyfikacja, a nie przechowywany obiekt błędu.",
          "Tekst nie przywraca typu, dodatkowego kontekstu ani źródłowego Error.",
          "Tak. Błąd warstwy publicznej ma dodać etap, lecz przechować otrzymany io::Error.",
        ],
      ),
      run(
        "api-error-source-chain-run",
        "Zobacz Display i source jako dwa kanały",
        "Uruchom przykład. Pierwszy fragment jest krótkim komunikatem dla człowieka; druga wartość sprawdza typ źródła przez Error. W zadaniu nie będziesz parsować pierwszego tekstu, aby podjąć decyzję programu.",
        errorSourceRun,
        "cannot load header true\n",
      ),
      choose(
        "api-error-source-chain-contract",
        "explain",
        "Który odczyt jest kontraktem programu?",
        "Klient chce ponowić tylko błąd transportu określonego rodzaju i zalogować etap. Który opis powinien odczytać?",
        "0",
        [
          "stage(), kind() oraz Error::source z downcast_ref do io::Error",
          "Podział error.to_string() po dwukropku",
          'format!("{:?}", error) i porównanie całego Debug',
        ],
        [
          "Typowane accessory i łańcuch Error są kontraktem maszyny; log może równolegle użyć Display.",
          "Tekst może się zmienić, zostać przetłumaczony lub zawierać dodatkowy kontekst.",
          "Debug służy diagnostyce i nie jest stabilnym protokołem decyzji klienta.",
        ],
      ),
      exercise({
        id: "api-error-source-chain-gate",
        kind: "debug",
        title: "Dodaj etap bez niszczenia źródła",
        prompt:
          "Uzupełnij read_tag. Ma przeczytać dokładnie jeden bajt przez Read::read_exact. Gdy I/O zawiedzie, zwróć FrameReadError z FrameReadStage::Tag i dokładnie tym io::Error, który zwrócił reader. Nie twórz nowego io::Error z tym samym kind ani nie pakuj tekstu. stage i kind są kontraktem maszyny; Display ma pozostać krótkim komunikatem dla człowieka. Test używa oryginalnego błędu OriginalMarker pod io::Error i odrzuci implementację, która zachowuje tylko napis lub kind.",
        code: errorSourceGateStarter,
        solution: errorSourceGateSolution,
        tests: errorSourceGateTests,
        hints: [
          "Utwórz bufor [0; 1] i zamień wynik read_exact przez map_err na FrameReadError.",
          "Do pola source włóż zmienną source z closure bez io::Error::new i bez format!.",
        ],
        gate: true,
        forbiddenPatterns: [
          "io::Error::new",
          "format!(",
          "to_string()",
          "unsafe",
        ],
      }),
      exercise({
        id: "api-error-source-chain-blank",
        kind: "blank",
        title: "Od pustej kartki: prefix z dwoma etapami błędu",
        prompt:
          "Zaprojektuj niezależny kontrakt odczytu prefixu ramki: jeden bajt discriminator i dwa bajty długości big-endian. Publiczne nazwy sprawdzane przez evaluator to PrefixStage z Discriminator i Length, PrefixError oraz read_prefix; po sukcesie klient dostaje krotkę zawierającą kolejno discriminator typu u8 i długość typu u16. PrefixError udostępnia accessory stage i kind: pierwszy zwraca PrefixStage, drugi ErrorKind. Jeżeli odczyt zawiedzie przed discriminatorem albo podczas długości, klient musi bez parsowania tekstu odróżnić właściwy etap, ErrorKind i pierwotną przyczynę I/O przez Error::source. Wybierz własną prywatną reprezentację błędu. Nie dodawaj main, nie twórz nowego io::Error i nie wymagaj Clone ani Debug od readera.",
        solution: errorSourceBlankSolution,
        tests: errorSourceBlankTests,
        hints: [
          "Każdy etap może własnym map_err dodać PrefixStage, lecz powinien zachować otrzymany io::Error jako przyczynę.",
          "Krótki Display jest dla człowieka; test podejmuje decyzję przez stage, kind, Error::source oraz downcast_ref.",
        ],
        gate: true,
        forbiddenPatterns: [
          "io::Error::new",
          "format!(",
          "to_string()",
          "unsafe",
        ],
      }),
      choose(
        "api-error-source-chain-recall",
        "recall",
        "Odtwórz ochronę łańcucha",
        "Dlaczego test ma pytać source.downcast_ref::<io::Error>() i potem sprawdzać jego source zamiast oczekiwać fragmentu komunikatu?",
        "1",
        [
          "Bo Display jest zawsze dokładnym formatem protokołu binarnego.",
          "Bo typ i łańcuch przyczyn wykrywają utratę oryginalnego błędu nawet przy tym samym ErrorKind i podobnym tekście.",
          "Bo Error::source zwraca kopię błędu, którą można dowolnie zmienić.",
        ],
        [
          "Display nie jest API do parsowania przez klienta.",
          "Tak. Taki test odrzuca mutanta, który tworzy nowy io::Error albo zachowuje tylko komunikat.",
          "source pożycza przyczynę; nie przenosi ani nie kopiuje obiektu.",
        ],
      ),
    ],
    misconceptions: [
      "Ten sam ErrorKind oznacza tę samą przyczynę błędu.",
      "Klient powinien podejmować decyzje przez parsowanie Display lub Debug.",
      "Dodanie własnego kontekstu wymaga zastąpienia oryginalnego io::Error.",
    ],
    transferTask:
      "Zaprojektuj publiczny błąd dekodera pliku z etapami Open, ReadHeader i Decode. Określ, które pola są accessorami programu, co pokaże Display i jak test udowodni, że źródłowy błąd I/O pozostał tym samym łańcuchem.",
    evidenceGate:
      "api-error-source-chain-gate sprawdza sukces, etap, ErrorKind, downcast_ref::<io::Error> i typ OriginalMarker w drugim ogniwie. Niezależny blank rozróżnia Discriminator od Length i zachowuje marker każdej przyczyny, a review-api-error-source-chain używa świeżego błędu wersji. Wszystkie odrzucają mutanta, który zachowuje tylko kind lub tekst.",
    sourceIds: ["public-api-error-source", "public-api-io-error-inner"],
  },
];

export const publicApiValueReviewExercises: Record<string, LessonStep> = {
  "api-validated-construction": exercise({
    id: "review-api-validated-construction",
    kind: "apply",
    title: "Powtórka: segment z bajtów",
    prompt:
      "Napisz TryFrom<Vec<u8>> dla świeżego Segment. Najpierw bezpiecznie sprawdź UTF-8, potem pustkę i limit 12 bajtów, a po sukcesie schowaj String za prywatnym polem. Powtórka sprawdza granice niezależnie od ChannelName.",
    code: validatedConstructionReviewStarter,
    solution: validatedConstructionReviewSolution,
    tests: validatedConstructionReviewTests,
    hints: [
      "String::from_utf8 ma zwrócić SegmentError::InvalidUtf8 bez unwrap.",
      "Po konwersji sprawdź text.is_empty() i text.len(), dopiero potem utwórz Segment(text).",
    ],
    forbiddenPatterns: ["unsafe", "unwrap(", "expect("],
  }),
  "api-error-source-chain": exercise({
    id: "review-api-error-source-chain",
    kind: "apply",
    title: "Powtórka: wersja protokołu z przyczyną",
    prompt:
      "Uzupełnij read_version dla niezależnego PrefixError. Czyta jeden bajt, dodaje PrefixStage::Version i zachowuje dokładnie io::Error zwrócony przez reader. Test sprawdza typ VersionMarker w źródle, nie tekst Display.",
    code: errorSourceReviewStarter,
    solution: errorSourceReviewSolution,
    tests: errorSourceReviewTests,
    hints: [
      "read_exact zwraca Result<(), io::Error>; map_err powinien przechować tę zmienną bez rekonstrukcji.",
      "Po sukcesie zwróć bufor[0].",
    ],
    forbiddenPatterns: ["io::Error::new", "format!(", "to_string()", "unsafe"],
  }),
};
