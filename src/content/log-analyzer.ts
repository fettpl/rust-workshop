import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  ProjectContract,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

function choice(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: "a" | "b" | "c",
  explanations: [string, string, string],
  evidenceKind: LessonStep["evidenceKind"] = "exposure",
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: answers.map((label, index) => ({
      id: ["a", "b", "c"][index],
      label,
    })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: {
        a: explanations[0],
        b: explanations[1],
        c: explanations[2],
      },
    },
    evidenceKind,
  };
}

function answer(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  accepted: string[],
  solution: string,
  evidenceKind: LessonStep["evidenceKind"] = "recall",
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    solution,
    evaluator: {
      kind: "answer",
      accepted,
      feedback: "Porównaj odpowiedź z kontraktem i uzasadnij wybór granicy.",
    },
    evidenceKind,
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

function tested(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  code: string,
  solution: string,
  tests: string,
  evidenceKind: LessonStep["evidenceKind"],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    code,
    solution,
    evaluator: {
      kind: "tests",
      tests,
      forbiddenPatterns: [".unwrap(", ".expect("],
    },
    expectedStatus: "success",
    evidenceKind,
    evidenceGate: true,
    hints: [
      "Najpierw wypisz przypadki graniczne z kontraktu: pustkę, poprawny przypadek i uszkodzone dane.",
      "Zwracaj błąd lub wynik wprost. Testy mają sprawdzić zachowanie, a nie sam fakt kompilacji.",
    ],
  };
}

const recordStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Level { Info, Warn, Error }
#[derive(Debug, PartialEq, Eq)]
enum ParseError { InvalidLine, InvalidTimestamp, InvalidLevel, EmptyMessage }
#[derive(Debug, PartialEq, Eq)]
struct LogRecord<'a> { timestamp: u64, level: Level, message: &'a str }

fn parse_record(line: &str) -> Result<LogRecord<'_>, ParseError> {
    if line.is_empty() { return Err(ParseError::InvalidLine); }
    Ok(LogRecord { timestamp: 0, level: Level::Info, message: line })
}`;

const recordSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Level { Info, Warn, Error }
#[derive(Debug, PartialEq, Eq)]
enum ParseError { InvalidLine, InvalidTimestamp, InvalidLevel, EmptyMessage }
#[derive(Debug, PartialEq, Eq)]
struct LogRecord<'a> { timestamp: u64, level: Level, message: &'a str }

fn parse_record(line: &str) -> Result<LogRecord<'_>, ParseError> {
    let (timestamp_text, rest) = line.split_once(' ').ok_or(ParseError::InvalidLine)?;
    if timestamp_text.is_empty() || !timestamp_text.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(ParseError::InvalidTimestamp);
    }
    let timestamp = match timestamp_text.parse::<u64>() {
        Ok(value) => value,
        Err(_) => return Err(ParseError::InvalidTimestamp),
    };
    let (level_text, message) = rest.split_once(' ').ok_or(ParseError::InvalidLine)?;
    let level = match level_text {
        "INFO" => Level::Info,
        "WARN" => Level::Warn,
        "ERROR" => Level::Error,
        _ => return Err(ParseError::InvalidLevel),
    };
    if message.trim().is_empty() || message.contains('\n') || message.contains('\r') {
        return Err(ParseError::EmptyMessage);
    }
    Ok(LogRecord { timestamp, level, message })
}`;

const recordTests = String.raw`#[test]
fn parses_timestamp_level_and_borrowed_remainder() {
    let line = "1700000000 WARN cache miss: żółć 🙂  ";
    let record = match parse_record(line) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(record.timestamp, 1_700_000_000);
    assert_eq!(record.level, Level::Warn);
    assert_eq!(record.message, "cache miss: żółć 🙂  ");
    let offset = match line.find("cache") { Some(value) => value, None => panic!("missing message") };
    assert_eq!(record.message.as_ptr(), line.as_ptr().wrapping_add(offset));
}

#[test]
fn rejects_bad_timestamp_level_and_empty_message() {
    assert_eq!(parse_record(""), Err(ParseError::InvalidLine));
    assert_eq!(parse_record("+1 INFO message"), Err(ParseError::InvalidTimestamp));
    assert_eq!(parse_record("１２ INFO message"), Err(ParseError::InvalidTimestamp));
    assert_eq!(parse_record("18446744073709551616 INFO message"), Err(ParseError::InvalidTimestamp));
    assert_eq!(parse_record("12 NOTICE message"), Err(ParseError::InvalidLevel));
    assert_eq!(parse_record("12 ERROR   "), Err(ParseError::EmptyMessage));
}

#[test]
fn accepts_the_u64_boundary_without_normalising_message() {
    let record = match parse_record("18446744073709551615 INFO  leading and trailing  ") {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(record.timestamp, u64::MAX);
    assert_eq!(record.message, " leading and trailing  ");
}`;

const readingStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
struct Reading<'a> { at: u64, unit: &'a str, note: &'a str }
#[derive(Debug, PartialEq, Eq)]
enum ReadingError { InvalidLine, InvalidTime, InvalidUnit, EmptyNote }

fn parse_reading(line: &str) -> Result<Reading<'_>, ReadingError> {
    if line.is_empty() { return Err(ReadingError::InvalidLine); }
    Ok(Reading { at: 0, unit: "", note: line })
}`;

const readingSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
struct Reading<'a> { at: u64, unit: &'a str, note: &'a str }
#[derive(Debug, PartialEq, Eq)]
enum ReadingError { InvalidLine, InvalidTime, InvalidUnit, EmptyNote }

fn parse_reading(line: &str) -> Result<Reading<'_>, ReadingError> {
    let (at_text, rest) = line.split_once('|').ok_or(ReadingError::InvalidLine)?;
    if at_text.is_empty() || !at_text.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(ReadingError::InvalidTime);
    }
    let at = match at_text.parse::<u64>() {
        Ok(value) => value,
        Err(_) => return Err(ReadingError::InvalidTime),
    };
    let (unit, note) = rest.split_once('|').ok_or(ReadingError::InvalidLine)?;
    if unit != "C" && unit != "kPa" { return Err(ReadingError::InvalidUnit); }
    if note.trim().is_empty() { return Err(ReadingError::EmptyNote); }
    Ok(Reading { at, unit, note })
}`;

const readingTests = String.raw`#[test]
fn preserves_a_sensor_note_with_unicode_and_separators() {
    let line = "42|kPa|  zawór: otwarty |🙂  ";
    let reading = match parse_reading(line) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(reading.at, 42);
    assert_eq!(reading.unit, "kPa");
    assert_eq!(reading.note, "  zawór: otwarty |🙂  ");
    assert_eq!(reading.note.as_ptr(), line.as_ptr().wrapping_add(7));
}

#[test]
fn distinguishes_bad_unit_and_empty_note() {
    assert_eq!(parse_reading("4|bar|ok"), Err(ReadingError::InvalidUnit));
    assert_eq!(parse_reading("4|C|   "), Err(ReadingError::EmptyNote));
}`;

const streamStarter = String.raw`use std::io::{self, BufRead};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Level { Info, Warn, Error }
#[derive(Debug, Default, PartialEq, Eq)]
struct Summary { info: u64, warn: u64, error: u64, malformed: u64 }

fn summarize<R: BufRead>(mut reader: R, _filter: Option<Level>) -> io::Result<Summary> {
    let mut line = String::new();
    while reader.read_line(&mut line)? > 0 { line.clear(); }
    Ok(Summary::default())
}`;

const streamSolution = String.raw`use std::io::{self, BufRead};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Level { Info, Warn, Error }
#[derive(Debug, Default, PartialEq, Eq)]
struct Summary { info: u64, warn: u64, error: u64, malformed: u64 }

fn valid_level(line: &str) -> Option<Level> {
    let (timestamp, rest) = line.split_once(' ')?;
    if timestamp.is_empty() || !timestamp.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    if timestamp.parse::<u64>().is_err() { return None; }
    let (level, message) = rest.split_once(' ')?;
    if message.trim().is_empty() || message.contains('\n') || message.contains('\r') {
        return None;
    }
    match level {
        "INFO" => Some(Level::Info),
        "WARN" => Some(Level::Warn),
        "ERROR" => Some(Level::Error),
        _ => None,
    }
}

fn summarize<R: BufRead>(mut reader: R, filter: Option<Level>) -> io::Result<Summary> {
    let mut summary = Summary::default();
    let mut line = String::new();
    loop {
        line.clear();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 { break; }
        let record = match line.strip_suffix('\n') {
            Some(without_lf) => match without_lf.strip_suffix('\r') {
                Some(value) => value,
                None => without_lf,
            },
            None => line.as_str(),
        };
        let level = match valid_level(record) {
            Some(value) => value,
            None => { summary.malformed += 1; continue; }
        };
        if filter.is_some_and(|wanted| wanted != level) { continue; }
        match level {
            Level::Info => summary.info += 1,
            Level::Warn => summary.warn += 1,
            Level::Error => summary.error += 1,
        }
    }
    Ok(summary)
}`;

const streamTests = String.raw`use std::io::{self, BufReader, Cursor, Read};

struct TinyReader { input: Vec<u8> }
impl Read for TinyReader {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        if self.input.is_empty() { return Ok(0); }
        target[0] = self.input.remove(0);
        Ok(1)
    }
}

struct FailingAfterReader { input: Vec<u8> }
impl Read for FailingAfterReader {
    fn read(&mut self, target: &mut [u8]) -> io::Result<usize> {
        if self.input.is_empty() {
            return Err(io::Error::new(io::ErrorKind::Other, "disk stopped"));
        }
        target[0] = self.input.remove(0);
        Ok(1)
    }
}

#[test]
fn counts_only_matching_valid_records_but_all_malformed_lines() {
    let input = "1 WARN first\n2 INFO drugi🙂\n2 WARN first\nnot a record\n3 ERROR hidden\n";
    let summary = match summarize(Cursor::new(input), Some(Level::Warn)) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(summary, Summary { info: 0, warn: 2, error: 0, malformed: 1 });
}

#[test]
fn handles_tiny_reads_crlf_duplicates_and_final_line_without_newline() {
    let input = "1 INFO a\r\n1 INFO a\n2 ERROR końcowa".as_bytes().to_vec();
    let reader = BufReader::with_capacity(1, TinyReader { input });
    let summary = match summarize(reader, None) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(summary.info, 2);
    assert_eq!(summary.error, 1);
    assert_eq!(summary.malformed, 0);
}

#[test]
fn propagates_a_reader_error() {
    let result = summarize(BufReader::with_capacity(1, FailingAfterReader { input: b"1 INFO before\n".to_vec() }), None);
    assert!(result.is_err());
}

#[test]
fn propagates_invalid_utf8_from_read_line() {
    let input = vec![b'1', b' ', b'I', b'N', b'F', b'O', b' ', 0xff, b'\n'];
    let result = summarize(Cursor::new(input), None);
    assert!(result.is_err());
}

#[test]
fn treats_a_lone_carriage_return_at_eof_as_malformed_data() {
    let summary = match summarize(Cursor::new("1 INFO final\r"), None) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(summary.malformed, 1);
}`;

const statusStarter = String.raw`use std::io::{self, BufRead};
#[derive(Debug, Default, PartialEq, Eq)]
struct Counts { open: u64, closed: u64, malformed: u64 }

fn count_statuses<R: BufRead>(mut reader: R, _wanted: Option<&str>) -> io::Result<Counts> {
    let mut line = String::new();
    while reader.read_line(&mut line)? > 0 { line.clear(); }
    Ok(Counts::default())
}`;

const statusSolution = String.raw`use std::io::{self, BufRead};
#[derive(Debug, Default, PartialEq, Eq)]
struct Counts { open: u64, closed: u64, malformed: u64 }

fn count_statuses<R: BufRead>(mut reader: R, wanted: Option<&str>) -> io::Result<Counts> {
    let mut counts = Counts::default();
    let mut line = String::new();
    loop {
        line.clear();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 { break; }
        let record = match line.strip_suffix('\n') { Some(value) => value, None => line.as_str() };
        let mut fields = record.splitn(3, '|');
        let _id = fields.next();
        let status = fields.next();
        let message = fields.next();
        let valid = match (status, message) {
            (Some(value), Some(text)) if (value == "OPEN" || value == "CLOSED") && !text.trim().is_empty() => value,
            _ => { counts.malformed += 1; continue; }
        };
        if wanted.is_some_and(|expected| expected != valid) { continue; }
        match valid {
            "OPEN" => counts.open += 1,
            "CLOSED" => counts.closed += 1,
            _ => unreachable!(),
        }
    }
    Ok(counts)
}`;

const statusTests = String.raw`use std::io::Cursor;

#[test]
fn filters_valid_statuses_and_keeps_invalid_count_independent() {
    let input = "a|OPEN|drzwi\nb|CLOSED|zamknięte🙂\na|OPEN|drzwi\nwrong\nc|CLOSED|ok";
    let counts = match count_statuses(Cursor::new(input), Some("OPEN")) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(counts, Counts { open: 2, closed: 0, malformed: 1 });
}

#[test]
fn empty_input_is_a_successful_empty_summary() {
    let counts = match count_statuses(Cursor::new(""), None) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(counts, Counts::default());
}

#[test]
fn propagates_status_read_failure_after_valid_data() {
    struct Broken;
    impl std::io::Read for Broken {
        fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
            Err(std::io::Error::other("status input failed"))
        }
    }
    let source = std::io::Read::chain(Cursor::new(b"a|OPEN|ok\n"), Broken);
    let result = count_statuses(std::io::BufReader::with_capacity(2, source), None);
    assert!(result.is_err(), "partial counts must not hide a read failure");
}`;

const alertStarter = String.raw`use std::io::{self, BufRead};
#[derive(Debug, Default, PartialEq, Eq)]
struct AlertCounts { active: u64, resolved: u64, malformed: u64 }

fn count_alerts<R: BufRead>(mut reader: R, _wanted: Option<&str>) -> io::Result<AlertCounts> {
    let mut line = String::new();
    while reader.read_line(&mut line)? > 0 { line.clear(); }
    Ok(AlertCounts::default())
}`;

const alertSolution = String.raw`use std::io::{self, BufRead};
#[derive(Debug, Default, PartialEq, Eq)]
struct AlertCounts { active: u64, resolved: u64, malformed: u64 }

fn count_alerts<R: BufRead>(mut reader: R, wanted: Option<&str>) -> io::Result<AlertCounts> {
    let mut counts = AlertCounts::default();
    let mut line = String::new();
    loop {
        line.clear();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 { break; }
        let record = match line.strip_suffix('\n') { Some(value) => value, None => line.as_str() };
        let mut fields = record.splitn(3, ';');
        let _id = fields.next();
        let state = fields.next();
        let text = fields.next();
        let state = match (state, text) {
            (Some(value), Some(message)) if (value == "ACTIVE" || value == "RESOLVED") && !message.trim().is_empty() => value,
            _ => { counts.malformed += 1; continue; }
        };
        if wanted.is_some_and(|expected| expected != state) { continue; }
        match state {
            "ACTIVE" => counts.active += 1,
            "RESOLVED" => counts.resolved += 1,
            _ => unreachable!(),
        }
    }
    Ok(counts)
}`;

const alertTests = String.raw`use std::io::Cursor;

#[test]
fn filters_alerts_but_keeps_malformed_visible() {
    let input = "a;ACTIVE;żółć🙂\nb;RESOLVED;done\na;ACTIVE;again\nmalformed\nc;RESOLVED;later";
    let counts = match count_alerts(Cursor::new(input), Some("ACTIVE")) {
        Ok(value) => value,
        Err(error) => panic!("unexpected error: {:?}", error),
    };
    assert_eq!(counts, AlertCounts { active: 2, resolved: 0, malformed: 1 });
}

#[test]
fn propagates_alert_read_failure_after_valid_data() {
    struct Broken;
    impl std::io::Read for Broken {
        fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
            Err(std::io::Error::other("alert input failed"))
        }
    }
    let source = std::io::Read::chain(Cursor::new(b"a;ACTIVE;ok\n"), Broken);
    let result = count_alerts(std::io::BufReader::with_capacity(2, source), None);
    assert!(result.is_err(), "partial counts must not hide a read failure");
}`;

const reportSolution = String.raw`#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Level { Info, Warn, Error }
#[derive(Debug, Default, PartialEq, Eq)]
struct Summary { info: u64, warn: u64, error: u64, malformed: u64 }

fn render_report(summary: &Summary, filter: Option<Level>) -> String {
    let filter_name = match filter {
        Some(Level::Info) => "INFO",
        Some(Level::Warn) => "WARN",
        Some(Level::Error) => "ERROR",
        None => "ALL",
    };
    let mut output = String::new();
    output.push_str("LOG REPORT V1\n");
    output.push_str("filter: ");
    output.push_str(filter_name);
    output.push('\n');
    output.push_str(&format!("INFO {}\n", summary.info));
    output.push_str(&format!("WARN {}\n", summary.warn));
    output.push_str(&format!("ERROR {}\n", summary.error));
    output.push_str(&format!("malformed {}\n", summary.malformed));
    output
}`;

const reportTests = String.raw`#[test]
fn emits_the_same_fixed_order_and_final_newline() {
    let summary = Summary { info: 2, warn: 0, error: 1, malformed: 3 };
    assert_eq!(
        render_report(&summary, Some(Level::Error)),
        "LOG REPORT V1\nfilter: ERROR\nINFO 2\nWARN 0\nERROR 1\nmalformed 3\n"
    );
}

#[test]
fn reports_all_for_no_filter_and_preserves_zeroes() {
    let summary = Summary { info: 0, warn: 4, error: 0, malformed: 0 };
    assert_eq!(
        render_report(&summary, None),
        "LOG REPORT V1\nfilter: ALL\nINFO 0\nWARN 4\nERROR 0\nmalformed 0\n"
    );
}`;

const inventoryStarter = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct Inventory { open: u64, closed: u64, malformed: u64 }

fn inventory_report(_inventory: &Inventory) -> String {
    String::new()
}`;

const inventorySolution = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct Inventory { open: u64, closed: u64, malformed: u64 }

fn inventory_report(inventory: &Inventory) -> String {
    format!(
        "INVENTORY V2\nOPEN {}\nCLOSED {}\nMALFORMED {}\n",
        inventory.open, inventory.closed, inventory.malformed
    )
}`;

const inventoryTests = String.raw`#[test]
fn uses_a_fixed_order_and_newline_for_a_new_domain() {
    assert_eq!(
        inventory_report(&Inventory { open: 3, closed: 1, malformed: 2 }),
        "INVENTORY V2\nOPEN 3\nCLOSED 1\nMALFORMED 2\n"
    );
}

#[test]
fn does_not_drop_zero_counts() {
    assert_eq!(
        inventory_report(&Inventory::default()),
        "INVENTORY V2\nOPEN 0\nCLOSED 0\nMALFORMED 0\n"
    );
}`;

const metricsStarter = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct Metrics { accepted: u64, rejected: u64, malformed: u64 }

fn metrics_report(_metrics: &Metrics) -> String {
    String::new()
}`;

const metricsSolution = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct Metrics { accepted: u64, rejected: u64, malformed: u64 }

fn metrics_report(metrics: &Metrics) -> String {
    format!(
        "METRICS V1\nACCEPTED {}\nREJECTED {}\nMALFORMED {}\n",
        metrics.accepted, metrics.rejected, metrics.malformed
    )
}`;

const metricsTests = String.raw`#[test]
fn renders_all_metrics_in_order_with_a_final_newline() {
    assert_eq!(
        metrics_report(&Metrics { accepted: 2, rejected: 1, malformed: 3 }),
        "METRICS V1\nACCEPTED 2\nREJECTED 1\nMALFORMED 3\n"
    );
}

#[test]
fn renders_zero_values_too() {
    assert_eq!(
        metrics_report(&Metrics::default()),
        "METRICS V1\nACCEPTED 0\nREJECTED 0\nMALFORMED 0\n"
    );
}`;

const accessStarter = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct AccessCounts { allow: u64, deny: u64, malformed: u64 }

fn access_report(_counts: &AccessCounts) -> String {
    String::new()
}`;

const accessSolution = String.raw`#[derive(Debug, Default, PartialEq, Eq)]
struct AccessCounts { allow: u64, deny: u64, malformed: u64 }

fn access_report(counts: &AccessCounts) -> String {
    format!(
        "ACCESS V1\nALLOW {}\nDENY {}\nMALFORMED {}\n",
        counts.allow, counts.deny, counts.malformed
    )
}`;

const accessTests = String.raw`#[test]
fn renders_access_counts_in_a_fixed_order() {
    assert_eq!(
        access_report(&AccessCounts { allow: 1, deny: 2, malformed: 0 }),
        "ACCESS V1\nALLOW 1\nDENY 2\nMALFORMED 0\n"
    );
}`;

export const logAnalyzerCompetencies: Competency[] = [
  {
    id: "log-borrowed-parse",
    title:
      "Parsujesz rekord z pożyczonym komunikatem i jawnym błędem dla każdej granicy.",
  },
  {
    id: "log-incremental-summary",
    title:
      "Agregujesz dane przyrostowo przez BufRead, filtrujesz poprawne rekordy i propagujesz IO.",
  },
  {
    id: "log-deterministic-report",
    title:
      "Tworzysz deterministyczny raport od zera, zachowując kolejność pól, zera i końcowy LF.",
  },
];

export const logAnalyzerConcepts: Concept[] = [
  {
    id: "log-borrowed-records",
    title: "Pożyczony rekord i jawny kontrakt parsera",
    prerequisites: ["shared-borrow"],
    competencyIds: ["log-borrowed-parse"],
    reviewPrompt:
      "Dlaczego LogRecord<'a> może przechowywać &str, a parser nie powinien obcinać prawej części komunikatu?",
    reviewAnswer:
      "&str jest pożyczonym widokiem na tekst wejściowy, więc rekord nie musi kopiować komunikatu. Parser rozdziela nagłówek, ale zachowuje resztę dokładnie, ponieważ spacje, Unicode i dodatkowe separatory są danymi.",
    distinguish:
      "Walidacja sprawdza pustkę i format, lecz nie normalizuje poprawnego komunikatu. Result opisuje osobno sukces z pożyczką i przewidywalne odrzucenie.",
  },
  {
    id: "log-stream-summary",
    title: "Przyrostowa agregacja przez BufRead",
    prerequisites: ["log-borrowed-records"],
    competencyIds: ["log-incremental-summary"],
    reviewPrompt:
      "Co powinno stać się z niepoprawnym wierszem, gdy podsumowanie ma filtr WARN?",
    reviewAnswer:
      "Wiersz zwiększa malformed niezależnie od filtra. Filtr decyduje tylko o poprawnych rekordach, które trafiają do liczników WARN, INFO lub ERROR.",
    distinguish:
      "Przyrostowe czytanie zachowuje mały stan podsumowania, ale zwykłe read_line może powiększać String do rozmiaru najdłuższej linii; ograniczony czytnik jest osobnym kontraktem pakietu.",
  },
  {
    id: "log-deterministic-report",
    title: "Raport jako jawny format wyjścia",
    prerequisites: ["log-stream-summary"],
    competencyIds: ["log-deterministic-report"],
    reviewPrompt:
      "Jak zagwarantować, że raport dwóch równoważnych podsumowań jest identyczny i kończy się LF?",
    reviewAnswer:
      "Buduj tekst od pustego Stringa w stałej kolejności: nagłówek, filtr, INFO, WARN, ERROR i malformed, a każdą linię zakończ LF. Nie pomijaj liczników równych zero.",
    distinguish:
      "Raportowanie ma ustalony format i kolejność, a agregacja odpowiada za wartości. Sortowanie mapy albo przypadkowa kolejność kluczy nie jest kontraktem deterministycznego raportu.",
  },
];

export const logAnalyzerSources: Source[] = [
  {
    id: "log-std-str-split",
    title: "Rust standard library: str::split_once and text slices",
    url: "https://doc.rust-lang.org/std/primitive.str.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie separatorów, pożyczek i zachowania Unicode.",
  },
  {
    id: "log-std-result",
    title: "Rust standard library: Result",
    url: "https://doc.rust-lang.org/std/result/enum.Result.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie wariantów błędów i propagacji ?.",
  },
  {
    id: "log-std-bufread",
    title: "Rust standard library: BufRead",
    url: "https://doc.rust-lang.org/std/io/trait.BufRead.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie read_line, buforowania lub obsługi IO.",
  },
  {
    id: "log-std-format",
    title: "Rust standard library: formatting and fmt::Write",
    url: "https://doc.rust-lang.org/std/fmt/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj po zmianie deterministycznego formatu raportu.",
  },
];

const recordRun = String.raw`fn main() {
    let line = "1700000000 INFO cache: żółć 🙂";
    let (head, message) = match line.split_once(' ') {
        Some(parts) => parts,
        None => ("", ""),
    };
    println!("nagłówek: {}", head);
    println!("komunikat: {}", message);
    let offset = match line.find("INFO") {
        Some(value) => value,
        None => 0,
    };
    println!("pożyczone: {}", message.as_ptr() == line.as_ptr().wrapping_add(offset));
}`;

const streamRun = String.raw`use std::io::{BufRead, Cursor};

fn main() {
    let input = Cursor::new("1 INFO start\n2 WARN retry\n");
    let mut lines = input.lines();
    let first = match lines.next() {
        Some(Ok(line)) => line,
        _ => String::new(),
    };
    let second = match lines.next() {
        Some(Ok(line)) => line,
        _ => String::new(),
    };
    println!("{}", first);
    println!("{}", second);
}`;

const reportRun = String.raw`fn main() {
    let mut report = String::new();
    report.push_str("LOG REPORT V1\n");
    report.push_str("filter: ALL\n");
    report.push_str("INFO 2\n");
    report.push_str("WARN 1\n");
    report.push_str("ERROR 0\n");
    report.push_str("malformed 1\n");
    print!("{}", report);
}`;

export const logAnalyzerLessons: Lesson[] = [
  {
    id: "log-records",
    moduleId: "log-analyzer",
    conceptIds: ["log-borrowed-records"],
    competencyIds: ["log-borrowed-parse"],
    prerequisites: ["testing-quality-workflow"],
    title: "Log record: pożycz tekst, sprawdź granice",
    subtitle: "Zamieniasz jedną linię w bezpieczny widok z jawnym błędem.",
    minutes: 22,
    outcomes: [
      "Rozpoznasz format TIMESTAMP LEVEL MESSAGE i zachowasz prawą część komunikatu.",
      "Zwrócisz LogRecord<'a> bez kopiowania komunikatu.",
      "Odrzucisz pusty, nie liczbowy lub nieznany fragment przez Result.",
    ],
    steps: [
      choice(
        "records-predict",
        "predict",
        "Przewidź pożyczkę",
        "Linia `42 WARN cache miss: 🙂` jest tekstem wejściowym. Co powinno stać się z `message` w LogRecord?",
        [
          "Pożyczony widok na resztę linii, bez utraty spacji",
          "Nowy String zawierający tylko słowo cache",
          "Liczba bajtów zamiast tekstu",
        ],
        "a",
        [
          "&str może wskazywać fragment wejścia i zachować dokładny komunikat.",
          "Dzielenie po kolejnych spacjach zgubiłoby resztę komunikatu.",
          "Parser zwraca tekstowy widok, nie samą długość.",
        ],
      ),
      run(
        "records-run",
        "Zobacz pierwsze rozdzielenie",
        "Uruchom przykład i obserwuj, że split_once pożycza obie części, a tekst Unicode pozostaje tekstem. Właściwy parser zachowa komunikat po drugim separatorze.",
        recordRun,
        "nagłówek: 1700000000\nkomunikat: INFO cache: żółć 🙂\npożyczone: true\n",
      ),
      choice(
        "records-observe",
        "observe",
        "Odrzuć zły poziom",
        "Co powinien zwrócić parser dla `12 NOTICE disk full`?",
        [
          "LogRecord z poziomem INFO",
          "Err(InvalidLevel)",
          "LogRecord z pustym komunikatem",
        ],
        "b",
        [
          "Nieznany poziom nie może zmienić znaczenia na INFO.",
          "Jawny błąd pokazuje, że wejście nie spełnia kontraktu.",
          "Komunikat jest niepusty; problemem jest poziom.",
        ],
      ),
      choice(
        "records-explain",
        "explain",
        "Rozdziel sprawdzanie od kopiowania",
        "Dlaczego wynik parsera może być `Result<LogRecord<'_>, ParseError>`?",
        [
          "Result oznacza sukces z pożyczką albo przewidywany błąd bez paniki",
          "Result automatycznie tworzy kopię każdego pola",
          "Result wymaga, aby komunikat był globalnym Stringiem",
        ],
        "a",
        [
          "Typ opisuje obie ścieżki i pozwala zachować widok wejścia.",
          "Pożyczka nadal jest pożyczką; Result nie alokuje za parser.",
          "Lifetime wiąże rekord z wejściem wywołującego, nie z globalnym magazynem.",
        ],
      ),
      tested(
        "records-transfer",
        "modify",
        "Przenieś kontrakt na odczyt czujnika",
        "Uzupełnij `parse_reading` dla nowej domeny. Rekord ma `at: u64`, `unit: &str` i `note: &str`; format to `AT|UNIT|NOTE`, jednostka to dokładnie `C` albo `kPa`, a notatka ma być niepusta po trim. Zachowaj wszystkie pozostałe znaki notatki i pożycz ją z wejścia.",
        readingStarter,
        readingSolution,
        readingTests,
        "transfer",
      ),
      tested(
        "records-debug",
        "debug",
        "Napraw parser rekordu",
        "Starter zwraca stały rekord. Napraw `parse_record(line: &str) -> Result<LogRecord<'_>, ParseError>`: przyjmij dziesiętny u64, dokładnie INFO/WARN/ERROR i niepusty komunikat będący całą resztą po drugim pojedynczym separatorem. Zachowaj Unicode, spacje brzegowe komunikatu i pożyczkę. Nie używaj unwrap ani expect.",
        recordStarter,
        recordSolution,
        recordTests,
        "fix",
      ),
      answer(
        "records-recall",
        "recall",
        "Przypomnij granicę parsera",
        "Co należy zachować, a co zwalidować w komunikacie?",
        ["Zachować dokładną prawą część, ale odrzucić pustą po trim"],
        "Zachowaj dokładną prawą część po separatorze, sprawdzając tylko, czy nie jest pusta po trim.",
        "recall",
      ),
      choice(
        "records-apply",
        "apply",
        "Zastosuj parser do audytu",
        "Nowy format audytu ma `ID KIND DETAILS`, a `DETAILS` może zawierać spacje. Jak przenieść zasadę?",
        [
          "Rozdziel tylko nagłówek i zachowaj resztę jako jeden widok",
          "Dziel po każdej spacji i wybierz pierwsze słowo",
          "Zamień DETAILS na stały tekst",
        ],
        "a",
        [
          "Reszta komunikatu jest danymi, więc dodatkowe spacje pozostają w pożyczonym widoku.",
          "Kolejne separatory należą do szczegółów.",
          "Stały tekst odrzucałby dane wejściowe.",
        ],
      ),
    ],
    misconceptions: [
      "Każdy parser tekstu powinien od razu tworzyć String.",
      "trim może bezpiecznie normalizować cały komunikat.",
      "Nieznany poziom można zamienić na INFO, bo program ma działać dalej.",
    ],
    transferTask:
      "Opisz i zaimplementuj parser innego rekordu, w którym prawa część może zawierać separatory oraz Unicode.",
    evidenceGate:
      "records-debug i records-transfer sprawdzają pożyczkę, pełny remainder, Unicode, granicę u64 i jawne odrzucenie błędu.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "records-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw parser rekordu z pożyczonym komunikatem. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "records-transfer",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw granice parsera, potem odtwórz go od pustej kartki. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: ["log-std-str-split", "log-std-result"],
  },
  {
    id: "log-streaming",
    moduleId: "log-analyzer",
    conceptIds: ["log-stream-summary"],
    competencyIds: ["log-incremental-summary"],
    prerequisites: ["log-records"],
    title: "Log stream: licz przyrostowo",
    subtitle:
      "Czytasz BufRead po jednym wierszu, filtrujesz sukcesy i zachowujesz błędy IO.",
    minutes: 25,
    outcomes: [
      "Zbudujesz Summary bez przechowywania wszystkich rekordów.",
      "Zastosujesz filtr dopiero po sprawdzeniu poprawności wiersza.",
      "Przekażesz błąd read_line i nazwiesz ryzyko rosnącego bufora linii.",
    ],
    steps: [
      choice(
        "stream-predict",
        "predict",
        "Przewidź licznik błędów",
        "Strumień ma poprawny INFO, błędny wiersz i poprawny WARN. Filtr to WARN. Jakie będą liczniki?",
        [
          "WARN 1 i malformed 1",
          "WARN 1 i malformed 0, bo filtr ukrywa błąd",
          "Wszystkie poziomy po 1",
        ],
        "a",
        [
          "Walidacja poprzedza filtr, więc zły wiersz jest policzony osobno.",
          "Filtr dotyczy poprawnych rekordów, nie oceny poprawności.",
          "INFO nie pasuje do filtra WARN, a malformed nie jest poziomem.",
        ],
      ),
      run(
        "stream-run",
        "Zobacz odczyt linii",
        "`BufRead::lines` upraszcza demonstrację, ale usuwa końcowy LF z każdej poprawnie odczytanej linii. W pakiecie użyjesz własnej pętli z buforem, aby móc jawnie obsłużyć granice.",
        streamRun,
        "1 INFO start\n2 WARN retry\n",
      ),
      choice(
        "stream-observe",
        "observe",
        "Nie połykaj IO",
        "Co powinno się stać, gdy `read_line` zwróci błąd dysku?",
        [
          "Zwrócić `Ok` z dotychczasowymi licznikami",
          "Przerwać i zwrócić ten błąd przez `io::Result`",
          "Zwiększyć malformed i czytać dalej",
        ],
        "b",
        [
          "Częściowy sukces ukrywa awarię źródła.",
          "Propagacja błędu zachowuje informację o tym, że raport nie jest kompletny.",
          "Błąd IO nie jest niepoprawnym rekordem tekstowym.",
        ],
      ),
      choice(
        "stream-explain",
        "explain",
        "Nazwij ograniczenie read_line",
        "Jaki koszt ma pojedynczy `String` używany przez `read_line`?",
        [
          "Może urosnąć do rozmiaru najdłuższej linii",
          "Zawsze trzyma całą historię pliku",
          "Gwarantuje limit 4096 bajtów",
        ],
        "a",
        [
          "Bufor jest ponownie używany, ale długa linia może wymusić jego wzrost.",
          "Po clear poprzednie linie nie zostają w buforze.",
          "read_line nie daje tu limitu 4096 bajtów; ograniczenie należy do późniejszej implementacji pakietu.",
        ],
      ),
      tested(
        "stream-transfer",
        "modify",
        "Przelicz statusy magazynu",
        "Uzupełnij `count_statuses` dla strumienia `ID|STATUS|MESSAGE`. Poprawne statusy to OPEN i CLOSED; filtr ma dotyczyć tylko poprawnych rekordów, malformed ma rosnąć niezależnie od filtra, a błąd BufRead ma wrócić jako io::Error.",
        statusStarter,
        statusSolution,
        statusTests,
        "transfer",
      ),
      tested(
        "stream-debug",
        "debug",
        "Napraw przyrostowe podsumowanie",
        "Starter czyta wejście, ale nie zmienia liczników. Napraw `summarize<R: BufRead>(reader, filter) -> io::Result<Summary>`: waliduj dziesiętny timestamp, poziom i niepusty komunikat, obsłuż LF, CRLF i ostatnią linię bez LF, zwiększ malformed przed filtrem, propaguj IO i nie zbieraj wszystkich rekordów. `read_line` może zachować bardzo długą linię w Stringu; czytnik z limitem pamięci będzie osobnym zadaniem w pakiecie. Nie używaj unwrap ani expect.",
        streamStarter,
        streamSolution,
        streamTests,
        "fix",
      ),
      answer(
        "stream-recall",
        "recall",
        "Przypomnij kolejność decyzji",
        "W jakiej kolejności obsłużyć pojedynczy wiersz?",
        [
          "Odetnij zakończenie, zwaliduj, zwiększ malformed przy błędzie, potem zastosuj filtr i licznik",
        ],
        "Najpierw odetnij zakończenie linii i zwaliduj; błąd zwiększa malformed, a poprawny rekord dopiero potem przechodzi przez filtr i licznik.",
        "recall",
      ),
      choice(
        "stream-apply",
        "apply",
        "Zastosuj przepływ do komunikatów",
        "W jaki sposób nie przechowywać całego pliku przy dodatkowym liczniku słów w komunikatach?",
        [
          "Policz słowa podczas obsługi bieżącej linii i odrzuć jej tekst po iteracji",
          "Zbierz wszystkie Stringi, a potem przejdź je drugi raz",
          "Pomijaj każdą linię z Unicode",
        ],
        "a",
        [
          "Stan agregacji może być mały, a bieżący String jest używany ponownie.",
          "To zwiększa pamięć wraz z plikiem i nie jest potrzebne.",
          "Unicode jest poprawnym tekstem wejściowym.",
        ],
      ),
    ],
    misconceptions: [
      "Filtr może ukrywać niepoprawne wiersze przed malformed.",
      "Błąd read_line jest tym samym co zły format rekordu.",
      "BufRead automatycznie ogranicza długość pojedynczej linii.",
    ],
    transferTask:
      "Zaprojektuj agregator innego strumienia, w którym stan ma stały rozmiar, a błędy źródła przerywają raport.",
    evidenceGate:
      "stream-debug i stream-transfer sprawdzają filtr kontra poprawność, duplikaty, Unicode, małe bufory, ostatnią linię i propagację IO.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "stream-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw przyrostowe liczenie rekordów. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "stream-transfer",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw politykę błędnych rekordów, potem odtwórz strumień od pustej kartki. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: ["log-std-bufread", "log-std-result"],
  },
  {
    id: "log-analyzer-project",
    moduleId: "log-analyzer",
    conceptIds: ["log-deterministic-report"],
    competencyIds: ["log-deterministic-report"],
    prerequisites: ["log-streaming"],
    title: "Log Analyzer: raport od pustej kartki",
    subtitle:
      "Łączysz podsumowanie z formatem, który można sprawdzić bajt po bajcie.",
    minutes: 25,
    outcomes: [
      "Zdefiniujesz stałą kolejność i nazwy pól raportu.",
      "Zachowasz wartości zero i końcowy znak LF w raporcie.",
      "Oddzielisz lokalną checklistę i pobrany pakiet od bramki sprawdzanej testami.",
    ],
    steps: [
      choice(
        "report-predict",
        "predict",
        "Przewidź końcówkę raportu",
        "Raport ma linie INFO, WARN, ERROR i malformed. Jaki zapis jest kompletny dla zera?",
        [
          "Wypisz `ERROR 0` i `malformed 0`, a cały raport zakończ LF",
          "Pomiń linie z zerem",
          "Zastąp zero słowem brak",
        ],
        "a",
        [
          "Zera są częścią deterministycznego formatu, a LF zamyka ostatnią linię.",
          "Pomijanie pól zmienia format dla równoważnych danych.",
          "Kontrakt liczbowy nie przewiduje zamiany na opis.",
        ],
      ),
      run(
        "report-run",
        "Zobacz budowę od zera",
        "Raport powstaje przez push_str w z góry ustalonej kolejności. Uruchom przykład i sprawdź, że print nie dopisuje własnego separatora; końcowy LF pochodzi z tekstu raportu.",
        reportRun,
        "LOG REPORT V1\nfilter: ALL\nINFO 2\nWARN 1\nERROR 0\nmalformed 1\n",
      ),
      choice(
        "report-observe",
        "observe",
        "Rozpoznaj niedeterministyczność",
        "Dlaczego iterowanie po nieuporządkowanym zbiorze pól nie jest dobrym formatem raportu?",
        [
          "Kolejność może zależeć od reprezentacji, więc identyczne dane nie muszą dać identycznych bajtów",
          "Zbiory zawsze sortują po nazwie",
          "Raport nie potrzebuje nazw pól",
        ],
        "a",
        [
          "Format wymaga jawnej kolejności, a zbiór jej nie opisuje.",
          "Nie wolno zakładać takiego zachowania bez kontraktu.",
          "Nazwy i kolejność pomagają odbiorcy i testom rozpoznać dane.",
        ],
      ),
      choice(
        "report-explain",
        "explain",
        "Oddziel wartości od prezentacji",
        "Co odpowiada za liczby, a co za ich kolejność w końcowym raporcie?",
        [
          "Summary dostarcza wartości, render_report dostarcza format i kolejność",
          "BufRead ma znać wszystkie nazwy raportu",
          "Parser powinien wypisywać raport podczas walidacji",
        ],
        "a",
        [
          "Rozdzielenie danych od wyjścia pozwala testować oba kontrakty niezależnie.",
          "BufRead czyta, ale nie powinien znać prezentacji.",
          "Parser ma opisać rekord albo błąd, nie produkować częściowego raportu.",
        ],
      ),
      tested(
        "report-transfer",
        "modify",
        "Sformatuj raport magazynu",
        "Uzupełnij `inventory_report` dla nowej domeny. Wymagany format to dokładnie `INVENTORY V2`, potem OPEN, CLOSED i MALFORMED w tej kolejności, z liczbą i LF w każdym wierszu. Nie pomijaj zer.",
        inventoryStarter,
        inventorySolution,
        inventoryTests,
        "transfer",
      ),
      tested(
        "report-assembly",
        "debug",
        "Napraw raport metryk",
        "Starter `metrics_report` zwraca pusty tekst. Uzupełnij nową domenę `Metrics { accepted, rejected, malformed }`: nagłówek `METRICS V1`, potem dokładnie ACCEPTED, REJECTED i MALFORMED w tej kolejności; każda linia kończy się LF, także przy zerach.",
        metricsStarter,
        metricsSolution,
        metricsTests,
        "fix",
      ),
      answer(
        "report-recall",
        "recall",
        "Przypomnij raport",
        "Jaką własność musi mieć końcowy raport, aby test porównujący cały String był wiarygodny?",
        ["Stały format: kolejność, nazwy, wartości zerowe i końcowy LF"],
        "Cały String jest wiarygodnym wynikiem, gdy format ma stałą kolejność, zachowuje nazwy i zera oraz kończy się umówionym LF.",
        "recall",
      ),
      {
        id: "report-blank",
        kind: "blank",
        title: "Zbuduj raport Log Analyzer od zera",
        prompt:
          "Zbuduj od pustej kartki funkcję `render_report` przyjmującą `&Summary` i `Option<Level>` oraz zwracającą `String`. Zdefiniuj porównywalne przez Debug, PartialEq i Eq typy `Level` (warianty Info, Warn, Error) oraz `Summary` z polami `info`, `warn`, `error`, `malformed: u64`. Raport ma dokładnie sześć linii: `LOG REPORT V1`, etykietę filtra INFO/WARN/ERROR albo ALL, następnie `INFO N`, `WARN N`, `ERROR N`, `malformed N`; każda linia, również ostatnia, ma LF. Testy sprawdzą filtr ERROR, brak filtra i wszystkie zera. Nie używaj unwrap ani expect. Praca w lokalnym pakiecie i samoocena checklisty są wskazówką; bramka tej lekcji jest zaliczana przez wynik testów.",
        solution: reportSolution,
        evaluator: {
          kind: "tests",
          tests: reportTests,
          forbiddenPatterns: [".unwrap(", ".expect("],
        },
        expectedStatus: "success",
        evidenceKind: "assessment",
        evidenceGate: true,
        hints: [
          "Najpierw zmapuj Option<Level> na dokładną etykietę, a później zapisuj pola w stałej kolejności.",
          "Zacznij od String::new i dopisz LF w każdym push_str lub format!, także po malformed.",
        ],
      },
    ],
    misconceptions: [
      "Raport może pomijać liczniki równe zero.",
      "Kolejność pól wynikająca z mapy jest wystarczająco stabilna.",
      "Udany lokalny download lub zaznaczenie checklisty dowodzi samodzielnej bramki.",
    ],
    transferTask:
      "Napisz format raportu dla nowej domeny przed kodowaniem i sprawdź go testem całego tekstu, łącznie z ostatnim LF.",
    evidenceGate:
      "report-blank i report-transfer oferują dwa warianty raportu. Kryterium wymaga samodzielnego zaliczenia jednego z nich; pakiet ujawnia tylko report-blank, a lokalna checklista pozostaje samooceną.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "report-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Przenieś formatowanie raportu do nowej domeny. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "report-assembly",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Przypomnij kontrakt, potem zbuduj raport od pustej kartki. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: ["log-std-format", "log-std-result"],
  },
];

export const logAnalyzerReviewExercises: Record<string, LessonStep> = {
  "log-borrowed-records": tested(
    "review-log-records",
    "apply",
    "Powtórka: wpis kontroli dostępu",
    "Zaimplementuj `parse_access` dla `u64|ACTION|DETAILS`. ACTION to dokładnie ALLOW albo DENY, DETAILS jest niepusty po trim i może zawierać kolejne `|`; zwróć pożyczony rekord i jawny błąd.",
    String.raw`#[derive(Debug, PartialEq, Eq)]
struct Access<'a> { at: u64, action: &'a str, details: &'a str }
#[derive(Debug, PartialEq, Eq)]
enum AccessError { InvalidLine, InvalidTime, InvalidAction, EmptyDetails }
fn parse_access(line: &str) -> Result<Access<'_>, AccessError> {
    if line.is_empty() { return Err(AccessError::InvalidLine); }
    Ok(Access { at: 0, action: "", details: line })
}`,
    String.raw`#[derive(Debug, PartialEq, Eq)]
struct Access<'a> { at: u64, action: &'a str, details: &'a str }
#[derive(Debug, PartialEq, Eq)]
enum AccessError { InvalidLine, InvalidTime, InvalidAction, EmptyDetails }
fn parse_access(line: &str) -> Result<Access<'_>, AccessError> {
    let (time, rest) = line.split_once('|').ok_or(AccessError::InvalidLine)?;
    if time.is_empty() || !time.bytes().all(|byte| byte.is_ascii_digit()) { return Err(AccessError::InvalidTime); }
    let at = match time.parse::<u64>() { Ok(value) => value, Err(_) => return Err(AccessError::InvalidTime) };
    let (action, details) = rest.split_once('|').ok_or(AccessError::InvalidLine)?;
    if action != "ALLOW" && action != "DENY" { return Err(AccessError::InvalidAction); }
    if details.trim().is_empty() { return Err(AccessError::EmptyDetails); }
    Ok(Access { at, action, details })
}`,
    String.raw`#[test]
fn access_contract_preserves_remainder_and_rejects_bad_action() {
    let access = match parse_access("7|DENY|  powód |🙂") { Ok(value) => value, Err(error) => panic!("{:?}", error) };
    assert_eq!(access, Access { at: 7, action: "DENY", details: "  powód |🙂" });
    assert_eq!(parse_access("7|MAYBE|x"), Err(AccessError::InvalidAction));
}`,
    "transfer",
  ),
  "log-stream-summary": tested(
    "review-log-stream",
    "apply",
    "Powtórka: zlicz alerty",
    "Zaimplementuj `count_alerts<R: BufRead>` dla nowej domeny `ID;STATE;TEXT`. STATE to ACTIVE/RESOLVED, filtr dotyczy poprawnych rekordów, malformed jest niezależne od filtra, a IO wraca jako `io::Result`.",
    alertStarter,
    alertSolution,
    alertTests,
    "transfer",
  ),
  "log-deterministic-report": tested(
    "review-log-report",
    "apply",
    "Powtórka: raport kontroli",
    "Zaimplementuj `access_report` dla `AccessCounts { allow, deny, malformed }`, czyli nowej domeny. Zwróć dokładnie `ACCESS V1`, potem ALLOW, DENY i MALFORMED w tej kolejności, z zerami i końcowym LF.",
    accessStarter,
    accessSolution,
    accessTests,
    "transfer",
  ),
};

export const logAnalyzerModule: CourseModule = {
  id: "log-analyzer",
  title: "Log Analyzer: rekord, strumień, raport",
  whyItMatters:
    "Pojedynczy parser, przyrostowe podsumowanie i deterministyczny raport składają się na małą aplikację, w której każdą granicę można sprawdzić testem.",
  capabilities: [
    "Pożyczasz komunikat z poprawnego rekordu i zwracasz jawne błędy formatu.",
    "Czytasz BufRead przyrostowo, rozdzielasz malformed od filtra i propagujesz IO.",
    "Budujesz raport od zera w stałej kolejności z końcowym LF.",
  ],
  prerequisites: ["testing-quality"],
  lessonIds: logAnalyzerLessons.map((lesson) => lesson.id),
  exitGate: [
    "Parser zachowuje remainder, Unicode i pożyczkę, odrzucając niepoprawny timestamp, poziom oraz pusty komunikat.",
    "Agregator przechodzi po jednym wierszu, liczy malformed niezależnie od filtra i zwraca błąd IO.",
    "Raport ma ustalone linie, zera, filtr i końcowy LF oraz przechodzi świeżą alternatywę domenową.",
  ],
  projectConnection:
    "Pobrany warsztat Cargo dodaje do tych kontraktów ograniczony czytnik, CLI i testy procesu; lokalne zadania pakietu są samooceną, a bramki modułu pozostają testami lekcji.",
  assessmentId: "log-analyzer-project/report-blank",
  gateCriteria: [
    {
      id: "log-records-gate",
      label:
        "Rekordy są pożyczane, walidowane jawnie i zachowują pełny komunikat.",
      taskRefs: [
        { lessonId: "log-records", stepId: "records-debug" },
        { lessonId: "log-records", stepId: "records-transfer" },
      ],
    },
    {
      id: "log-stream-gate",
      label:
        "Strumień liczy poprawne rekordy z filtrem, a malformed i IO mają osobne granice.",
      taskRefs: [
        { lessonId: "log-streaming", stepId: "stream-debug" },
        { lessonId: "log-streaming", stepId: "stream-transfer" },
      ],
    },
    {
      id: "log-report-gate",
      label: "Raport jest deterministyczny, kompletny i kończy się LF.",
      taskRefs: [
        { lessonId: "log-analyzer-project", stepId: "report-blank" },
        { lessonId: "log-analyzer-project", stepId: "report-transfer" },
      ],
    },
  ],
};

export const logAnalyzerProject: ProjectContract = {
  id: "log-analyzer-project",
  lessonIds: logAnalyzerLessons.map((lesson) => lesson.id),
  reviewConceptIds: Object.keys(logAnalyzerReviewExercises),
  title: "Log Analyzer: strumień i raport",
  objective:
    "Zbuduj bibliotekę i program terminalowy bez zewnętrznych zależności. Mają czytać rekordy TIMESTAMP LEVEL MESSAGE, podsumowywać poprawne wpisy i generować raport w stałym formacie.",
  requiredBehaviors: [
    "Parser przyjmuje czas jako dziesiętne u64, poziom INFO/WARN/ERROR i niepusty komunikat UTF-8. Komunikat jest pożyczonym widokiem, który zachowuje oryginalne spacje.",
    "Agregator czyta przyrostowo, liczy malformed niezależnie od opcjonalnego filtra i propaguje IO.",
    "Raport ma ustalony nagłówek, kolejność liczników, wartości zero i końcowy LF.",
  ],
  requiredEvidence: [
    "Testy parsera obejmują Unicode, duplikaty, u64::MAX i odrzucenie błędu.",
    "Testy strumienia obejmują małe bufory, CRLF, ostatnią linię bez LF, niezależność filtra od licznika błędnych rekordów oraz awarię odczytu.",
    "Test raportu porównuje cały tekst. Osobne zadanie zmienia dane i format; pobranie pakietu i lokalna lista kontrolna nie zaliczają lekcji.",
  ],
  constraints: [
    "Edycja Rust 2024 i biblioteka standardowa, bez zewnętrznych zależności.",
    "Nie przechowuj całej historii rekordów ani diagnostyki.",
    "Czytnik w pakiecie przechowuje najwyżej 4096 bajtów linii przed LF. Resztę zbyt długiej linii pomija do jej końca i zwiększa malformed tylko raz.",
    "CLI przyjmuje plik oraz opcjonalny dokładny poziom; błędy trafiają na stderr, kończą się kodem niezerowym i nie wypisują częściowego raportu.",
  ],
  lessonId: "log-analyzer-project",
  adversarialLessonId: "log-streaming",
  adversarialInject:
    "Sprawdź bardzo długą linię, odczyt w małych fragmentach i awarię IO. Lekcja pokazuje ograniczenia read_line; w pakiecie Cargo zbuduj czytnik z jawnym limitem pamięci.",
  retrospective: [
    "Które pola były pożyczonym widokiem, a które musiały żyć w podsumowaniu?",
    "Czy malformed było liczone przed filtrem i co stało się przy błędzie IO?",
    "Który znak kończy raport i jak dowiodły tego testy całego tekstu?",
    "Co było sprawdzoną bramką lekcji, a co jedynie lokalną checklistą pobranego pakietu?",
  ],
  learnerInstruction: {
    title: "Projekt końcowy: Study Session CLI od zera",
    summary:
      "Cel: zbuduj własny lokalny Study Session CLI w osobnym projekcie Cargo, wyłącznie ze std. Core17 wystarcza technicznie; zalecamy oddanie po Mini grep (4 lekcje) oraz Box → Rc/Weak → wątki → kanały → Arc/Mutex (15 lekcji). Dowody to własny kod, testy, wyniki CLI i uzasadnienie; retrospektywa opisuje decyzję własności, politykę błędów i zmianę --min-total. Korzystaj z dokumentacji i zapisuj pomoc.",
    points: [
      "Program przyjmuje dokładnie jeden argument: ścieżkę do pliku w UTF-8. Każda niepusta linia ma postać `name;minutes`, zawiera dokładnie jeden średnik, a oba pola trzeba przyciąć; name nie może być puste.",
      "minutes to dziesiętne cyfry ASCII z zakresu 1..=1440. Puste linie pomijasz. Nazwy są napisami Unicode rozróżniającymi wielkość liter.",
      "Zsumuj minuty dla każdej nazwy i wypisz `name;total`, po jednej linii, w porządku napisów Rust. Powtarzające się nazwy po przycięciu tworzą jeden wynik.",
      "Dla błędnego rekordu wypisz na stderr jego numer linii od 1, przejdź dalej dla poprawnych rekordów, wypisz poprawne podsumowanie i zakończ `exit 2`. Błędna liczba argumentów, błąd I/O albo błąd UTF-8 trafia na stderr, nie wypisuje raportu i kończy się `exit 1`; całkowicie poprawny plik kończy się `exit 0`.",
      "Sprawdzaj sumowanie z kontrolą przepełnienia. Rekord powodujący przepełnienie jest błędny, a wcześniejsze poprawne sumy pozostają zachowane.",
      "Użyj wyłącznie biblioteki standardowej, bez zewnętrznych zależności. Sieć, znaczniki czasu, wdrożenie i próg wydajności są poza wymaganiami. Wybierz własne typy, nazwy, podział funkcji i strukturę danych.",
      "Zapisz decyzję o nazwach pożyczonych lub posiadanych oraz o strukturze danych. Dodaj własne testy błędnego rekordu i agregacji z kolejnością; pokaż wynik polecenia dla pliku poprawnego i mieszanego oraz krótko omów jedną decyzję własności.",
      "Przykład 1 — wejście. Pierwsza linia zaczyna się jedną spacją.\n` Basia;30`\n`Ada;5`\n`Basia; 15`\nstdout:\n`Ada;5`\n`Basia;45`\nstderr jest puste, a program kończy się kodem 0.",
      "Przykład 2 — wejście:\n`Ada;5`\n`to nie jest rekord`\n`Basia;7`\nstdout:\n`Ada;5`\n`Basia;7`\nstderr zawiera numer linii 2 (treść komunikatu wybierasz samodzielnie), a program kończy się kodem 2.",
      "Udokumentowana samoocena lub przegląd zewnętrzny powinny obejmować powtarzające się nazwy oraz dwie różnie zapisane nazwy, które po przycięciu są tą samą nazwą, a także Unicode, pusty plik, CRLF, granice minut, złe pola, błąd I/O i przepełnienie. Samoocena, przegląd zewnętrzny i bezpośrednio zaobserwowana praca to odrębne kategorie dowodu; pobrany pakiet referencyjny jest pomocą, nie artefaktem uczącego się ani automatycznym zaliczeniem. W retrospektywie odpowiedz: który wcześniejszy koncept zdecydował o projekcie, który nieudany test zmienił decyzję i jaka granica pozostaje niesprawdzona?",
    ],
    followUp: {
      title: "Po pierwszym przeglądzie: `--min-total N`",
      summary:
        "Po zapisanej samoocenie lub przeglądzie zewnętrznym pierwszego artefaktu podejmij zmienione wymaganie. Jest publiczne; zapisz wcześniejszy kontakt z nim zamiast zakładać, że jest nieznane.",
      points: [
        "Dodaj opcjonalne `--min-total N`, na przykład `--min-total 10`. Filtruje ono wyłącznie końcowe wypisywane sumy; stare wywołanie bez filtra pozostaje zgodne.",
        "Nie zmieniaj parsowania, diagnostyki ani kodów wyjścia. Zaktualizuj testy i wyjaśnij, która granica wymagania się zmieniła.",
        "Sposób zapisu liczby `N` nie jest tu narzucony. Określ dozwolony zapis i obsługę błędów we własnym kontrakcie; pokaż tę granicę w testach i wyjaśnij swoją decyzję.",
      ],
    },
  },
};
