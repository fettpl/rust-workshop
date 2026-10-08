import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const miniGrepSearchSources: Source[] = [
  {
    id: "mini-grep-bufread",
    title: "Rust standard library: BufRead",
    url: "https://doc.rust-lang.org/std/io/trait.BufRead.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie użycia fill_buf, consume, EOF albo semantyki metod read_until, read_line i lines.",
  },
  {
    id: "mini-grep-error-source",
    title: "Rust standard library: Error::source",
    url: "https://doc.rust-lang.org/std/error/trait.Error.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie błędów wrapperów, łańcucha przyczyn lub sposobu prezentowania błędu I/O.",
  },
  {
    id: "mini-grep-str-from-utf8",
    title: "Rust standard library: str::from_utf8",
    url: "https://doc.rust-lang.org/std/str/fn.from_utf8.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie granicy między surowymi bajtami wejścia a walidacją tekstu UTF-8.",
  },
];

export const miniGrepSearchCompetencies: Competency[] = [
  {
    id: "mini-grep-select-context-union",
    title:
      "Wybierasz unijny, uporządkowany kontekst wokół trafień bez powtarzania linii z nakładających się okien.",
  },
  {
    id: "mini-grep-bound-bufread-before-copy",
    title:
      "Czytasz BufRead małymi porcjami, sprawdzasz limit surowej linii przed skopiowaniem całości i zachowujesz przyczynę I/O.",
  },
];

export const miniGrepSearchConcepts: Concept[] = [
  {
    id: "grep-context-selection",
    title: "Unia okien kontekstu wokół trafień",
    prerequisites: ["log-deterministic-report"],
    competencyIds: ["mini-grep-select-context-union"],
    reviewPrompt:
      "Dlaczego dwa nakładające się trafienia trzeba połączyć przed renderowaniem, zamiast wypisać osobne okno dla każdego?",
    reviewAnswer:
      "Jedna linia może należeć do kilku okien, lecz w wyniku ma wystąpić raz i w rosnącym porządku numerów. Zbiór zaznaczonych indeksów albo równoważna unia rozdziela wybór od renderowania.",
    distinguish:
      "Kontekst nie jest drugą kategorią danych: linia trafienia i linia sąsiednia mają ten sam format wyniku. Różnicę tworzy tylko reguła wyboru indeksów.",
  },
  {
    id: "grep-bounded-input",
    title: "Ograniczone wejście liniowe z BufRead",
    prerequisites: ["grep-context-selection"],
    competencyIds: ["mini-grep-bound-bufread-before-copy"],
    reviewPrompt:
      "Czemu read_until do rosnącego Vec, a potem kontrola len, nie chroni przed zbyt długą linią?",
    reviewAnswer:
      "read_until najpierw dopisuje wszystkie przeczytane bajty aż do LF albo EOF. Limit sprawdzony potem wykrywa problem, ale nie zapobiega już skopiowaniu całej linii. Trzeba ograniczyć oglądany fragment przed extend_from_slice.",
    distinguish:
      "CR usuwa się tylko jako część zakończenia CRLF. Samotny CR na EOF jest bajtem danych; pusty bufor od BufRead oznacza EOF, a nie dodatkową pustą linię po końcowym LF.",
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

const contextSelectionRun = `fn select(lines: &[&str], query: &str, radius: usize) -> Vec<usize> {
    let mut chosen = vec![false; lines.len()];
    for (index, line) in lines.iter().enumerate() {
        if !query.is_empty() && line.contains(query) {
            let from = index.saturating_sub(radius);
            let until = index.saturating_add(radius).saturating_add(1).min(lines.len());
            chosen[from..until].fill(true);
        }
    }
    chosen.into_iter().enumerate().filter_map(|(index, yes)| yes.then_some(index)).collect()
}

fn main() {
    let lines = ["zero", "hit A", "middle", "hit B", "tail"];
    println!("{:?}", select(&lines, "hit", 1));
}`;

const contextSelectionGateStarter = `pub fn select_context<'a>(
    _lines: &'a [&'a str],
    _query: &str,
    _radius: usize,
) -> Vec<(usize, &'a str)> {
    todo!("połącz nakładające się okna zanim zwrócisz indeksy")
}`;

const contextSelectionGateTests = `#[test]
fn joins_overlapping_windows_once_in_source_order() {
    let lines = ["zero", "hit A", "middle", "hit B", "tail", "after"];
    assert_eq!(
        select_context(&lines, "hit", 1),
        vec![
            (0, "zero"),
            (1, "hit A"),
            (2, "middle"),
            (3, "hit B"),
            (4, "tail"),
        ],
    );
    assert_eq!(select_context(&lines, "hit", 0), vec![(1, "hit A"), (3, "hit B")]);
    assert_eq!(select_context(&lines, "", 3), Vec::<(usize, &str)>::new());
}

#[test]
fn clamps_edges_and_keeps_unicode_text_as_borrowed_lines() {
    let lines = ["żółw", "cisza", "żółw", "koniec"];
    let selected = select_context(&lines, "żół", usize::MAX);
    assert_eq!(selected, vec![(0, "żółw"), (1, "cisza"), (2, "żółw"), (3, "koniec")]);
    assert_eq!(lines, ["żółw", "cisza", "żółw", "koniec"]);
}`;

const contextSelectionBlankTests = `#[test]
fn detours_use_asymmetric_windows_without_crossing_a_barrier() {
    let stops = [
        "dworzec",
        "ZAMKNIĘTY most",
        "park",
        "BLOKADA graniczna",
        "muzeum",
        "ZAMKNIĘTY tunel",
        "port",
        "lotnisko",
    ];
    assert_eq!(
        detour_stops(&stops, "ZAMKNIĘTY", "BLOKADA", 1, 2),
        vec![0, 1, 2, 4, 5, 6, 7],
    );
    assert_eq!(
        detour_stops(&["BLOKADA ZAMKNIĘTY", "park", "ZAMKNIĘTY tunel"], "ZAMKNIĘTY", "BLOKADA", 3, 0),
        vec![1, 2],
    );
    assert_eq!(
        detour_stops(&["a", "ZAMKNIĘTY", "b", "c"], "ZAMKNIĘTY", "BLOKADA", 0, 2),
        vec![1, 2, 3],
    );
    assert_eq!(detour_stops(&stops, "", "BLOKADA", 2, 2), Vec::<usize>::new());
}`;

const contextSelectionReviewStarter = `pub fn merge_priority_windows(
    _windows: &[(usize, usize, u8)],
) -> Vec<(usize, usize, u8)> {
    todo!("połącz styczne lub nakładające się okna i zachowaj najwyższy priorytet")
}`;

const contextSelectionReviewTests = `#[test]
fn review_merges_unsorted_touching_windows_and_keeps_priority() {
    assert_eq!(
        merge_priority_windows(&[(8, 10, 1), (2, 5, 2), (4, 9, 3), (9, 12, 1), (20, 22, 3)]),
        vec![(2, 12, 3), (20, 22, 3)],
    );
    assert_eq!(
        merge_priority_windows(&[(0, 2, u8::MAX), (2, 3, 1), (5, 4, 8), (7, 7, 9)]),
        vec![(0, 3, u8::MAX)],
    );
}`;

const boundedInputRun = `use std::io::BufRead;

fn main() {
    let mut input = b"kot\\r\\npies\\r".as_slice();
    let mut first = Vec::new();
    input.read_until(b'\\n', &mut first).unwrap();
    let mut second = Vec::new();
    input.read_until(b'\\n', &mut second).unwrap();
    println!("{first:?}");
    println!("{second:?}");
}`;

const boundedInputGateStarter = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead};

#[derive(Debug)]
pub enum LineReadError {
    TooLong { maximum: usize },
    Io { source: io::Error },
}

impl LineReadError {
    fn io(source: io::Error) -> Self {
        Self::Io { source }
    }
}

impl fmt::Display for LineReadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooLong { maximum } => write!(formatter, "line exceeds {maximum} raw bytes"),
            Self::Io { .. } => formatter.write_str("cannot read input line"),
        }
    }
}

impl Error for LineReadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::TooLong { .. } => None,
            Self::Io { source } => Some(source),
        }
    }
}

pub fn read_line_bytes<R: BufRead>(
    _reader: &mut R,
    _maximum: usize,
) -> Result<Option<Vec<u8>>, LineReadError> {
    todo!("czytaj porcjami, sprawdzaj surowy limit przed kopiowaniem i obsłuż CRLF")
}`;

const boundedInputGateTests = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead, BufReader, Cursor, Read};
use std::sync::Arc;

#[test]
fn handles_small_buffers_crlf_and_eof_without_inventing_a_final_line() {
    let mut reader = BufReader::with_capacity(2, Cursor::new(b"\\xC5\\xBC\\r\\nlast\\r".to_vec()));
    assert_eq!(read_line_bytes(&mut reader, 3).unwrap(), Some("ż".as_bytes().to_vec()));
    assert_eq!(read_line_bytes(&mut reader, 5).unwrap(), Some(b"last\\r".to_vec()));
    assert_eq!(read_line_bytes(&mut reader, 5).unwrap(), None);

    let mut exact = Cursor::new(b"abcd\\r\\n".to_vec());
    assert_eq!(read_line_bytes(&mut exact, 5).unwrap(), Some(b"abcd".to_vec()));
    assert_eq!(read_line_bytes(&mut exact, 5).unwrap(), None);
}

struct WholeLine {
    bytes: Vec<u8>,
    consumed: usize,
}

impl Read for WholeLine {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        let available = self.fill_buf()?;
        let count = target.len().min(available.len());
        target[..count].copy_from_slice(&available[..count]);
        self.consume(count);
        Ok(count)
    }
}

impl BufRead for WholeLine {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        Ok(&self.bytes[self.consumed..])
    }

    fn consume(&mut self, amount: usize) {
        self.consumed += amount;
    }
}

#[test]
fn rejects_an_over_limit_line_after_observing_at_most_one_extra_byte() {
    let mut reader = WholeLine { bytes: b"12345z-not-copied\\n".to_vec(), consumed: 0 };
    assert!(matches!(read_line_bytes(&mut reader, 5), Err(LineReadError::TooLong { maximum: 5 })));
    assert!(reader.consumed <= 6, "the reader may inspect the sixth byte, but must not buffer the whole line");
}

#[derive(Debug)]
struct OriginalCause(Arc<()>);

impl fmt::Display for OriginalCause {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("original input device failure")
    }
}

impl Error for OriginalCause {}

struct Broken {
    token: Arc<()>,
}

impl Read for Broken {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(
            io::ErrorKind::ConnectionReset,
            OriginalCause(Arc::clone(&self.token)),
        ))
    }
}

impl BufRead for Broken {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        Err(io::Error::new(
            io::ErrorKind::ConnectionReset,
            OriginalCause(Arc::clone(&self.token)),
        ))
    }

    fn consume(&mut self, _: usize) {}
}

#[test]
fn keeps_the_original_io_error_as_the_typed_source() {
    let token = Arc::new(());
    let error = read_line_bytes(&mut Broken { token: Arc::clone(&token) }, 5).unwrap_err();
    assert_eq!(error.to_string(), "cannot read input line");
    let io_error = error.source().and_then(|source| source.downcast_ref::<io::Error>()).expect("original io::Error");
    assert_eq!(io_error.kind(), io::ErrorKind::ConnectionReset);
    let cause = io_error.get_ref().and_then(|source| source.downcast_ref::<OriginalCause>()).expect("original marker");
    assert!(Arc::ptr_eq(&cause.0, &token));
}`;

const boundedInputBlankTests = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead, BufReader, Cursor, Read};
use std::sync::Arc;

#[test]
fn nul_records_keep_cr_and_lf_as_data_and_distinguish_eof_from_truncation() {
    let mut input = BufReader::with_capacity(1, Cursor::new(b"A\\r\\n\\0B\\r\\0".to_vec()));
    assert_eq!(next_nul_record(&mut input, 3).unwrap(), Some(b"A\\r\\n".to_vec()));
    assert_eq!(next_nul_record(&mut input, 3).unwrap(), Some(b"B\\r".to_vec()));
    assert_eq!(next_nul_record(&mut input, 3).unwrap(), None);

    let mut empty = Cursor::new(b"\\0".to_vec());
    assert_eq!(next_nul_record(&mut empty, 0).unwrap(), Some(Vec::new()));
    assert_eq!(next_nul_record(&mut empty, 0).unwrap(), None);

    let mut incomplete = Cursor::new(b"last\\r\\n".to_vec());
    assert!(matches!(next_nul_record(&mut incomplete, 8), Err(RecordError::Truncated)));
}

struct WholeBuffer {
    bytes: Vec<u8>,
    consumed: usize,
}

impl Read for WholeBuffer {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        let available = self.fill_buf()?;
        let count = target.len().min(available.len());
        target[..count].copy_from_slice(&available[..count]);
        self.consume(count);
        Ok(count)
    }
}

impl BufRead for WholeBuffer {
    fn fill_buf(&mut self) -> io::Result<&[u8]> { Ok(&self.bytes[self.consumed..]) }
    fn consume(&mut self, amount: usize) { self.consumed += amount; }
}

#[test]
fn nul_record_limit_stops_before_the_rest_of_an_available_buffer_is_copied() {
    let mut input = WholeBuffer { bytes: b"1234\\0not copied".to_vec(), consumed: 0 };
    assert!(matches!(next_nul_record(&mut input, 3), Err(RecordError::TooLong { maximum: 3 })));
    assert!(input.consumed <= 4);
}

#[derive(Debug)]
struct DeviceCause(Arc<()>);
impl fmt::Display for DeviceCause {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result { formatter.write_str("device cause") }
}
impl Error for DeviceCause {}

struct Broken { token: Arc<()> }
impl Read for Broken {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(io::ErrorKind::BrokenPipe, DeviceCause(Arc::clone(&self.token))))
    }
}
impl BufRead for Broken {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        Err(io::Error::new(io::ErrorKind::BrokenPipe, DeviceCause(Arc::clone(&self.token))))
    }
    fn consume(&mut self, _: usize) {}
}

#[test]
fn record_reader_keeps_the_original_typed_device_cause() {
    let token = Arc::new(());
    let error = next_nul_record(&mut Broken { token: Arc::clone(&token) }, 2).unwrap_err();
    let source = error.source().and_then(|source| source.downcast_ref::<io::Error>()).expect("io source");
    assert_eq!(source.kind(), io::ErrorKind::BrokenPipe);
    let cause = source.get_ref().and_then(|cause| cause.downcast_ref::<DeviceCause>()).expect("original cause");
    assert!(Arc::ptr_eq(&cause.0, &token));
}`;

const boundedInputReviewStarter = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead};

#[derive(Debug)]
pub enum FrameError {
    TooLarge { length: usize, maximum: usize },
    Truncated { expected: usize, received: usize },
    Io { source: io::Error },
}

impl FrameError {
    fn io(source: io::Error) -> Self { Self::Io { source } }
}

impl fmt::Display for FrameError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooLarge { length, maximum } => write!(formatter, "frame of {length} bytes exceeds {maximum}"),
            Self::Truncated { expected, received } => write!(formatter, "frame ended after {received} of {expected} bytes"),
            Self::Io { .. } => formatter.write_str("cannot read frame"),
        }
    }
}

impl Error for FrameError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::TooLarge { .. } | Self::Truncated { .. } => None,
            Self::Io { source } => Some(source),
        }
    }
}

pub fn next_frame<R: BufRead>(
    _reader: &mut R,
    _maximum: usize,
) -> Result<Option<Vec<u8>>, FrameError> {
    todo!("odróżnij EOF przed prefiksem od krótkiego payloadu i nie czytaj nadmiaru po prefiksie")
}`;

const boundedInputReviewTests = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead, BufReader, Cursor, Read};
use std::sync::Arc;

#[test]
fn frame_review_distinguishes_eof_between_frames_from_eof_in_payload() {
    let mut input = BufReader::with_capacity(1, Cursor::new(vec![3, b'a', b'\\n', b'b', 0, 2, 0xC5, 0xBC]));
    assert_eq!(next_frame(&mut input, 3).unwrap(), Some(b"a\\nb".to_vec()));
    assert_eq!(next_frame(&mut input, 3).unwrap(), Some(Vec::new()));
    assert_eq!(next_frame(&mut input, 3).unwrap(), Some("ż".as_bytes().to_vec()));
    assert_eq!(next_frame(&mut input, 3).unwrap(), None);

    let mut short_payload = Cursor::new(vec![3, b'x', b'y']);
    assert!(matches!(next_frame(&mut short_payload, 3), Err(FrameError::Truncated { expected: 3, received: 2 })));
}

struct WholeBuffer {
    bytes: Vec<u8>,
    consumed: usize,
}

impl Read for WholeBuffer {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        let available = self.fill_buf()?;
        let count = target.len().min(available.len());
        target[..count].copy_from_slice(&available[..count]);
        self.consume(count);
        Ok(count)
    }
}

impl BufRead for WholeBuffer {
    fn fill_buf(&mut self) -> io::Result<&[u8]> { Ok(&self.bytes[self.consumed..]) }
    fn consume(&mut self, amount: usize) { self.consumed += amount; }
}

#[test]
fn frame_review_rejects_a_too_large_prefix_before_reading_its_payload() {
    let mut input = WholeBuffer { bytes: vec![4, b'o', b'v', b'e', b'r'], consumed: 0 };
    assert!(matches!(next_frame(&mut input, 3), Err(FrameError::TooLarge { length: 4, maximum: 3 })));
    assert_eq!(input.consumed, 1, "only the length prefix is part of this decision");
}

#[derive(Debug)]
struct FrameCause(Arc<()>);
impl fmt::Display for FrameCause {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result { formatter.write_str("frame cause") }
}
impl Error for FrameCause {}

struct Broken { token: Arc<()> }
impl Read for Broken {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(io::ErrorKind::TimedOut, FrameCause(Arc::clone(&self.token))))
    }
}
impl BufRead for Broken {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        Err(io::Error::new(io::ErrorKind::TimedOut, FrameCause(Arc::clone(&self.token))))
    }
    fn consume(&mut self, _: usize) {}
}

#[test]
fn frame_review_keeps_the_original_error_chain() {
    let token = Arc::new(());
    let error = next_frame(&mut Broken { token: Arc::clone(&token) }, 3).unwrap_err();
    let source = error.source().and_then(|source| source.downcast_ref::<io::Error>()).expect("io source");
    assert_eq!(source.kind(), io::ErrorKind::TimedOut);
    let cause = source.get_ref().and_then(|cause| cause.downcast_ref::<FrameCause>()).expect("original cause");
    assert!(Arc::ptr_eq(&cause.0, &token));
}`;

const contextSelectionGateSolution = `pub fn select_context<'a>(
    lines: &'a [&'a str],
    query: &str,
    radius: usize,
) -> Vec<(usize, &'a str)> {
    if query.is_empty() {
        return Vec::new();
    }

    let mut selected = vec![false; lines.len()];
    for (index, line) in lines.iter().enumerate() {
        if line.contains(query) {
            let start = index.saturating_sub(radius);
            let end = index
                .saturating_add(radius)
                .saturating_add(1)
                .min(lines.len());
            selected[start..end].fill(true);
        }
    }

    selected
        .into_iter()
        .enumerate()
        .filter_map(|(index, selected)| selected.then_some((index, lines[index])))
        .collect()
}`;

const contextSelectionBlankSolution = `pub fn detour_stops(
    stops: &[&str],
    alert_marker: &str,
    barrier_marker: &str,
    before: usize,
    after: usize,
) -> Vec<usize> {
    if alert_marker.is_empty() {
        return Vec::new();
    }

    let is_barrier = |stop: &str| !barrier_marker.is_empty() && stop.contains(barrier_marker);
    let mut selected = vec![false; stops.len()];

    for (alert_index, stop) in stops.iter().enumerate() {
        if is_barrier(stop) || !stop.contains(alert_marker) {
            continue;
        }

        for offset in 0..=before {
            let Some(index) = alert_index.checked_sub(offset) else {
                break;
            };
            if is_barrier(stops[index]) {
                break;
            }
            selected[index] = true;
        }
        for offset in 1..=after {
            let Some(index) = alert_index.checked_add(offset).filter(|index| *index < stops.len()) else {
                break;
            };
            if is_barrier(stops[index]) {
                break;
            }
            selected[index] = true;
        }
    }

    selected
        .into_iter()
        .enumerate()
        .filter_map(|(index, selected)| selected.then_some(index))
        .collect()
}`;

const contextSelectionReviewSolution = `pub fn merge_priority_windows(
    windows: &[(usize, usize, u8)],
) -> Vec<(usize, usize, u8)> {
    let mut sorted: Vec<_> = windows
        .iter()
        .copied()
        .filter(|(start, end, _)| start < end)
        .collect();
    sorted.sort_by_key(|(start, end, _)| (*start, *end));

    let mut merged: Vec<(usize, usize, u8)> = Vec::new();
    for (start, end, priority) in sorted {
        match merged.last_mut() {
            Some((_, previous_end, previous_priority)) if start <= *previous_end => {
                *previous_end = (*previous_end).max(end);
                *previous_priority = (*previous_priority).max(priority);
            }
            _ => merged.push((start, end, priority)),
        }
    }
    merged
}`;

const boundedInputGateSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead};

#[derive(Debug)]
pub enum LineReadError {
    TooLong { maximum: usize },
    Io { source: io::Error },
}

impl LineReadError {
    fn io(source: io::Error) -> Self {
        Self::Io { source }
    }
}

impl fmt::Display for LineReadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooLong { maximum } => write!(formatter, "line exceeds {maximum} raw bytes"),
            Self::Io { .. } => formatter.write_str("cannot read input line"),
        }
    }
}

impl Error for LineReadError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::TooLong { .. } => None,
            Self::Io { source } => Some(source),
        }
    }
}

pub fn read_line_bytes<R: BufRead>(
    reader: &mut R,
    maximum: usize,
) -> Result<Option<Vec<u8>>, LineReadError> {
    let mut line = Vec::new();

    loop {
        let (consumed, ended_with_lf) = {
            let available = reader.fill_buf().map_err(LineReadError::io)?;
            if available.is_empty() {
                return if line.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(line))
                };
            }

            let remaining = maximum - line.len();
            let inspected = available.len().min(remaining.saturating_add(1));

            match available[..inspected].iter().position(|byte| *byte == b'\\n') {
                Some(newline) => {
                    line.extend_from_slice(&available[..newline]);
                    (newline + 1, true)
                }
                None if available.len() > remaining => {
                    return Err(LineReadError::TooLong { maximum });
                }
                None => {
                    line.extend_from_slice(available);
                    (available.len(), false)
                }
            }
        };

        reader.consume(consumed);
        if ended_with_lf {
            if line.last() == Some(&b'\\r') {
                line.pop();
            }
            return Ok(Some(line));
        }
    }
}`;

const boundedInputBlankSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead};

#[derive(Debug)]
pub enum RecordError {
    TooLong { maximum: usize },
    Truncated,
    Io { source: io::Error },
}

impl RecordError {
    fn io(source: io::Error) -> Self {
        Self::Io { source }
    }
}

impl fmt::Display for RecordError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooLong { maximum } => write!(formatter, "record exceeds {maximum} raw bytes"),
            Self::Truncated => formatter.write_str("NUL-terminated record ended at EOF"),
            Self::Io { .. } => formatter.write_str("cannot read record"),
        }
    }
}

impl Error for RecordError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::TooLong { .. } | Self::Truncated => None,
            Self::Io { source } => Some(source),
        }
    }
}

pub fn next_nul_record<R: BufRead>(
    reader: &mut R,
    maximum: usize,
) -> Result<Option<Vec<u8>>, RecordError> {
    let mut record = Vec::new();

    loop {
        let (consumed, ended_with_nul) = {
            let available = reader.fill_buf().map_err(RecordError::io)?;
            if available.is_empty() {
                return if record.is_empty() {
                    Ok(None)
                } else {
                    Err(RecordError::Truncated)
                };
            }

            let remaining = maximum - record.len();
            let inspected = available.len().min(remaining.saturating_add(1));
            match available[..inspected].iter().position(|byte| *byte == b'\\0') {
                Some(terminator) => {
                    record.extend_from_slice(&available[..terminator]);
                    (terminator + 1, true)
                }
                None if available.len() > remaining => {
                    return Err(RecordError::TooLong { maximum });
                }
                None => {
                    record.extend_from_slice(available);
                    (available.len(), false)
                }
            }
        };
        reader.consume(consumed);
        if ended_with_nul {
            return Ok(Some(record));
        }
    }
}`;

const boundedInputReviewSolution = `use std::error::Error;
use std::fmt;
use std::io::{self, BufRead};

#[derive(Debug)]
pub enum FrameError {
    TooLarge { length: usize, maximum: usize },
    Truncated { expected: usize, received: usize },
    Io { source: io::Error },
}

impl FrameError {
    fn io(source: io::Error) -> Self {
        Self::Io { source }
    }
}

impl fmt::Display for FrameError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooLarge { length, maximum } => write!(formatter, "frame of {length} bytes exceeds {maximum}"),
            Self::Truncated { expected, received } => write!(formatter, "frame ended after {received} of {expected} bytes"),
            Self::Io { .. } => formatter.write_str("cannot read frame"),
        }
    }
}

impl Error for FrameError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::TooLarge { .. } | Self::Truncated { .. } => None,
            Self::Io { source } => Some(source),
        }
    }
}

pub fn next_frame<R: BufRead>(
    reader: &mut R,
    maximum: usize,
) -> Result<Option<Vec<u8>>, FrameError> {
    let length = {
        let available = reader.fill_buf().map_err(FrameError::io)?;
        let Some(length) = available.first() else {
            return Ok(None);
        };
        usize::from(*length)
    };
    reader.consume(1);
    if length > maximum {
        return Err(FrameError::TooLarge { length, maximum });
    }

    let mut frame = Vec::with_capacity(length);
    while frame.len() < length {
        let consumed = {
            let available = reader.fill_buf().map_err(FrameError::io)?;
            if available.is_empty() {
                return Err(FrameError::Truncated {
                    expected: length,
                    received: frame.len(),
                });
            }
            let count = (length - frame.len()).min(available.len());
            frame.extend_from_slice(&available[..count]);
            count
        };
        reader.consume(consumed);
    }
    Ok(Some(frame))
}`;

export const miniGrepSearchLessons: Lesson[] = [
  {
    id: "grep-context-selection",
    moduleId: "mini-grep",
    conceptIds: ["grep-context-selection"],
    competencyIds: ["mini-grep-select-context-union"],
    prerequisites: ["log-analyzer-project"],
    title: "Kontekst bez powtórzonych linii",
    subtitle: "Najpierw wybierz numery linii, dopiero potem je pokaż.",
    minutes: 24,
    outcomes: [
      "Łączysz nakładające się okna kontekstu w jedną uporządkowaną listę.",
      "Rozróżniasz wybór linii od ich późniejszego formatowania.",
      "Chronisz brzegi pliku oraz pusty wzorzec świadomą regułą API.",
    ],
    steps: [
      choose(
        "grep-context-selection-predict",
        "predict",
        "Dwa trafienia, jedno sąsiedztwo",
        "Linie 2 i 4 zawierają szukany tekst, a kontekst ma szerokość 1. Jak często linia 3 powinna znaleźć się w wyniku?",
        "1",
        ["Ani razu", "Raz", "Dwa razy"],
        [
          "Linia 3 jest kontekstem obu trafień.",
          "Dobrze: wynik jest unią indeksów, więc jedna linia ma jedną pozycję.",
          "Dwa niezależne okna powieliłyby dane i złamały kontrakt wyniku.",
        ],
      ),
      run(
        "grep-context-selection-contrast",
        "Obserwuj unię indeksów",
        "Uruchom przykład. Bool dla każdego numeru linii zachowuje kolejność wejścia i nie pozwala dopisać tej samej linii drugi raz.",
        contextSelectionRun,
        "[0, 1, 2, 3, 4]\n",
      ),
      choose(
        "grep-context-selection-explain",
        "explain",
        "Wybór przed tekstem",
        "Co jest najprostszym kontraktem wewnętrznym dla pierwszego etapu wyszukiwania?",
        "0",
        [
          "Numery wybranych linii w rosnącej kolejności.",
          "Gotowe napisy z osobnym prefiksem dla kontekstu.",
          "Lista okien, którą klient sam musi usuwać z duplikatów.",
        ],
        [
          "Tak. Renderowanie może potem użyć jednego formatu dla trafienia i kontekstu.",
          "To miesza wybór z prezentacją, choć oba etapy mają inne odpowiedzialności.",
          "Kontrakt wyszukiwarki ma już zwrócić unię bez duplikatów.",
        ],
      ),
      exercise({
        id: "grep-context-selection-gate",
        kind: "debug",
        title: "Połącz okna przed wynikiem",
        prompt:
          "Napraw `select_context`. Ma zwrócić pary numeru i pożyczonej linii dla niepustego literalnego wzorca. Każdy numer ma pojawić się raz, w kolejności wejścia; promień obejmuje linię trafienia i sąsiadów, a brzegi pliku są obcięte.",
        code: contextSelectionGateStarter,
        solution: contextSelectionGateSolution,
        tests: contextSelectionGateTests,
        hints: [
          "Najpierw zaznacz indeksy w strukturze o długości lines.len(), zamiast od razu dodawać tekst do wyniku.",
          "Dla trafienia oblicz początek przez saturating_sub, a koniec ogranicz długością wejścia. Potem przejdź po znacznikach rosnąco.",
        ],
        gate: true,
      }),
      exercise({
        id: "grep-context-selection-blank",
        kind: "blank",
        title: "Objazdy z barierami",
        prompt:
          "System objazdów ma pożyczoną listę nazw przystanków. Udostępnij `detour_stops`: po liście przyjmuje dosłowny marker alarmu, dosłowny marker bariery, a następnie dwa zasięgi typu `usize`: przed i po alarmie. Zwraca `Vec<usize>` indeksów liczonych od zera. Bariera nigdy nie należy do wyniku i zatrzymuje objazd po swojej stronie. Wynik ma być jedną rosnącą listą bez powtórzeń; pusty marker alarmu nie wywołuje objazdu.",
        solution: contextSelectionBlankSolution,
        tests: contextSelectionBlankTests,
        hints: [
          "Zasięg przed alarmem i po nim opisują dwie niezależne reguły objazdu.",
          "Przystanek z markerem bariery nie trafia do wyniku, nawet gdy zawiera też marker alarmu.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Dwa trafienia nie uzasadniają dwóch kopii wspólnej linii kontekstu.",
      "Kontekst nie wymaga osobnego tekstowego formatu; wybór i renderowanie to różne kroki.",
      "Dodawanie promienia do usize bez ochrony może przepełnić indeks przy skrajnym wejściu.",
    ],
    transferTask:
      "Dla listy pomiarów temperatury zwróć numery alarmów oraz ich sąsiadów jako jedną uporządkowaną unię.",
    evidenceGate:
      "Zalicza tylko rozwiązanie łączące nakładające się sąsiedztwa, obcinające brzegi i niewypisujące pustego wzorca jako trafienia.",
    sourceIds: miniGrepSearchSources.map((source) => source.id),
  },
  {
    id: "grep-bounded-input",
    moduleId: "mini-grep",
    conceptIds: ["grep-bounded-input"],
    competencyIds: ["mini-grep-bound-bufread-before-copy"],
    prerequisites: ["grep-context-selection"],
    title: "Linia wejścia z limitem przed kopią",
    subtitle:
      "Bufor daje widok bajtów; limit musi zadziałać zanim powstanie pełna kopia.",
    minutes: 30,
    outcomes: [
      "Czytasz BufRead przez fill_buf i consume w małych porcjach.",
      "Liczysz surowe bajty przed LF, także CR w CRLF, zanim dopiszesz je do Vec.",
      "Rozpoznajesz EOF, zachowujesz samotny CR i przekazujesz oryginalny błąd I/O przez source().",
    ],
    steps: [
      choose(
        "grep-bounded-input-predict",
        "predict",
        "Co pozostaje po read_until?",
        "Wejście to bajty `kot\\r\\npies\\r`. Pierwsze read_until(b'\\n') kończy się na LF. Który bajt nadal znajduje się w pierwszym Vec?",
        "2",
        ["Żaden znak końca linii", "Tylko LF", "CR i LF"],
        [
          "read_until dopisuje również separator.",
          "CR przed LF także jest jeszcze w surowych bajtach.",
          "Tak. Dopiero kod kontraktu może rozpoznać CRLF i usunąć CR razem z LF.",
        ],
      ),
      run(
        "grep-bounded-input-contrast",
        "Zobacz surowe granice",
        "`read_until` pokazuje, dlaczego późniejsza kontrola długości jest za późno: metoda najpierw dopisuje dane do Vec. Drugi odczyt kończy się EOF i zachowuje samotny CR.",
        boundedInputRun,
        "[107, 111, 116, 13, 10]\n[112, 105, 101, 115, 13]\n",
      ),
      choose(
        "grep-bounded-input-explain",
        "explain",
        "Granica przed extend",
        "Gdy bieżąca część linii ma już 5 bajtów przy limicie 5, co wolno zrobić po zobaczeniu następnego bajtu innnego niż LF?",
        "1",
        [
          "Dopisać cały pozostały bufor, potem odrzucić Vec.",
          "Odrzucić linię przed dopisaniem tego bajtu do własnego Vec.",
          "Użyć lines(), bo usuwa końce linii.",
        ],
        [
          "To kopiuje nieograniczoną linię przed decyzją.",
          "Tak. Można obejrzeć następny bajt do podjęcia decyzji, lecz nie kopiować całej reszty.",
          "lines() usuwa CRLF i nie daje kontroli nad surowym limitem przed własnym buforowaniem.",
        ],
      ),
      exercise({
        id: "grep-bounded-input-gate",
        kind: "debug",
        title: "Odczytaj jedną ograniczoną linię",
        prompt:
          "Uzupełnij `read_line_bytes`. Zwraca kolejną linię jako bajty bez LF i bez CR należącego do CRLF. Limit dotyczy bajtów przed LF, wliczając CR. EOF bez danych zwraca None, a samotny CR na EOF pozostaje danymi. Nie wolno najpierw skopiować całej długiej linii; błąd I/O ma pozostać dostępny przez Error::source.",
        code: boundedInputGateStarter,
        solution: boundedInputGateSolution,
        tests: boundedInputGateTests,
        hints: [
          "fill_buf daje pożyczony fragment. Najpierw policz, ile bajtów wolno obejrzeć: pozostały limit oraz co najwyżej jeden kolejny bajt.",
          "Skopiuj tylko do LF albo do końca bezpiecznego fragmentu, zakończ pożyczkę, potem wywołaj consume. CR usuń tylko po znalezionym LF.",
        ],
        gate: true,
        forbiddenPatterns: [".read_until("],
      }),
      exercise({
        id: "grep-bounded-input-blank",
        kind: "blank",
        title: "Rejestr NUL z czytnika urządzenia",
        prompt:
          "Czytnik urządzenia przekazuje kolejne rekordy bajtowe zakończone bajtem NUL. Udostępnij `next_nul_record`, które działa na mutowalnie pożyczonym `BufRead` i przyjmuje limit `usize`; sukces ma postać `Ok(Option<Vec<u8>>)`. Zwrócony `Vec<u8>` nie zawiera NUL, więc początkowy NUL daje `Some` z pustym Vec. Publiczny `RecordError` ma warianty `TooLong { maximum: usize }`, `Truncated` oraz `Io { source: io::Error }`. Funkcja zwraca brak rekordu tylko wtedy, gdy EOF pojawia się przed jego pierwszym bajtem; EOF po danych bez NUL jest `Truncated`. CR i LF są tu zwykłymi danymi. Rekord ma limit surowych bajtów, a zbyt długi nie może zostać w całości skopiowany przed odrzuceniem. Błąd urządzenia ma zachować swój typ i ErrorKind przez source.",
        solution: boundedInputBlankSolution,
        tests: boundedInputBlankTests,
        hints: [
          "W tym formacie ani CR, ani LF nie wyznaczają granicy rekordu.",
          "Brak całego rekordu i rekord bez końcowego NUL są różnymi stanami protokołu.",
        ],
        gate: true,
        forbiddenPatterns: [".read_until("],
      }),
    ],
    misconceptions: [
      "read_until i read_line mogą rozbudować podany bufor przed późniejszą kontrolą długości.",
      "CR nie jest zawsze końcem linii: usuwa się go wyłącznie bezpośrednio przed LF.",
      "Nowy io::Error z tym samym ErrorKind nie zachowuje pierwotnej przyczyny urządzenia.",
    ],
    transferTask:
      "Napisz czytnik etykiet urządzenia z krótkim limitem, porcjowanym BufRead i zachowanym źródłem błędu.",
    evidenceGate:
      "Zalicza tylko rozwiązanie, które kontroluje limit przed pełnym kopiowaniem, obsługuje małe porcje oraz rozróżnia CRLF, EOF i oryginalny błąd I/O. To dowodzi granicy własnego Vec, nie limitu alokacji narzuconego przez dowolną obcą implementację BufRead.",
    sourceIds: miniGrepSearchSources.map((source) => source.id),
  },
];

export const miniGrepSearchReviewExercises: Record<string, LessonStep> = {
  "grep-context-selection": exercise({
    id: "review-grep-context-selection",
    kind: "apply",
    title: "Powtórka: plan zmian o najwyższym priorytecie",
    prompt:
      "Uzupełnij `merge_priority_windows`. Każda trójka opisuje półotwarty przedział czasu `(start, end, priority)`. Zwróć uporządkowane zmiany: nakładające się lub stykające się przedziały tworzą jedną zmianę, która zachowuje najwyższy priorytet. Puste i odwrócone przedziały pomiń.",
    code: contextSelectionReviewStarter,
    solution: contextSelectionReviewSolution,
    tests: contextSelectionReviewTests,
    hints: [
      "Przedziały mają być porównywane chronologicznie, niezależnie od kolejności zgłoszeń.",
      "Gdy zmiany łączą się, ich koniec i priorytet mogą pochodzić z różnych zgłoszeń.",
    ],
    gate: true,
  }),
  "grep-bounded-input": exercise({
    id: "review-grep-bounded-input",
    kind: "apply",
    title: "Powtórka: krótkie ramki binarne",
    prompt:
      "Uzupełnij `next_frame`. Pierwszy bajt ramki oznacza długość payloadu. Publiczny `FrameError` ma warianty `TooLarge { length: usize, maximum: usize }`, `Truncated { expected: usize, received: usize }` i `Io { source: io::Error }`. EOF przed prefiksem oznacza brak następnej ramki, a EOF po prefiksie jest `Truncated`. Limit trzeba sprawdzić zanim payload trafi do własnego Vec; zachowaj przyczynę I/O przez source.",
    code: boundedInputReviewStarter,
    solution: boundedInputReviewSolution,
    tests: boundedInputReviewTests,
    hints: [
      "Prefix nie jest częścią payloadu, lecz wyznacza jego oczekiwany rozmiar.",
      "Dane binarne ramki mogą zawierać LF i NUL.",
    ],
    gate: true,
    forbiddenPatterns: [".read_until("],
  }),
};
