/** Bounded, callable APIs shared by content and author compiler verification. */
export const borrowedNumberContract = {
  starter: `fn borrowed_number(owner: &Option<String>) -> Option<u16> { None }
fn main() {}`,
  solution: `fn borrowed_number(owner: &Option<String>) -> Option<u16> {
    owner.as_ref().and_then(|text| text.trim().parse::<u16>().ok())
}
fn main() {}`,
  tests: `#[test]
fn borrowed_number_preserves_owner_and_option_policy() {
    let parse: fn(&Option<String>) -> Option<u16> = borrowed_number;
    for (input, expected) in [("0", Some(0)), ("\u{2003}42\u{2003}", Some(42)), ("", None), ("żółć", None), ("65536", None)] {
        let owner = Some(input.to_string());
        assert_eq!(parse(&owner), expected);
        assert_eq!(owner.as_ref().unwrap(), input);
        assert_eq!(parse(&owner), expected);
    }
    assert_eq!(parse(&None), None);
}`,
};
export const configTypes = `#[derive(Debug, PartialEq)]
enum ConfigError { Missing, Syntax, Range }`;
export const configContract = {
  starter: `${configTypes}
fn parse_limit(text: Option<&str>) -> Result<u16, ConfigError> { Ok(0) }
fn main() {}`,
  solution: `${configTypes}
fn parse_limit(text: Option<&str>) -> Result<u16, ConfigError> {
    text.ok_or_else(|| ConfigError::Missing)
        .and_then(|text| text.trim().parse::<u32>().map_err(|error| match error.kind() {
            std::num::IntErrorKind::PosOverflow | std::num::IntErrorKind::NegOverflow => ConfigError::Range,
            _ => ConfigError::Syntax,
        }))
        .and_then(|value| if value <= 1000 { Ok(value as u16) } else { Err(ConfigError::Range) })
}
fn main() {}`,
  tests: `#[test]
fn config_distinguishes_missing_zero_syntax_and_range() {
    let parse: fn(Option<&str>) -> Result<u16, ConfigError> = parse_limit;
    assert_eq!(parse(None), Err(ConfigError::Missing));
    assert_eq!(parse(Some("0")), Ok(0));
    assert_eq!(parse(Some("\u{2003}1000\u{2003}")), Ok(1000));
    for text in ["", " ", "żółć", "12x", "-1"] { assert_eq!(parse(Some(text)), Err(ConfigError::Syntax), "{text}"); }
    for text in ["1001", "65536", "4294967295", "4294967296"] { assert_eq!(parse(Some(text)), Err(ConfigError::Range), "{text}"); }
    let owner = String::from(" 7 ");
    assert_eq!(parse(Some(&owner)), Ok(7));
    assert_eq!(owner, " 7 ");
}`,
};
export const readingTypes = `#[derive(Debug, PartialEq)]
enum ReadingError { Syntax, Range }`;
export const optionalReadingContract = {
  starter: `${readingTypes}
fn optional_reading(text: Option<&str>) -> Result<Option<i16>, ReadingError> { Ok(None) }
fn main() {}`,
  solution: `${readingTypes}
fn optional_reading(text: Option<&str>) -> Result<Option<i16>, ReadingError> {
    text.map(|text| text.trim().parse::<i16>().map_err(|error| match error.kind() {
            std::num::IntErrorKind::PosOverflow | std::num::IntErrorKind::NegOverflow => ReadingError::Range,
            _ => ReadingError::Syntax,
        })
        .and_then(|value| if (-20..=50).contains(&value) { Ok(value) } else { Err(ReadingError::Range) }))
        .transpose()
}
fn main() {}`,
  tests: `#[test]
fn optional_reading_allows_absence_but_rejects_bad_present_text() {
    assert_eq!(optional_reading(None), Ok(None));
    for (text, value) in [("0", 0), ("-20", -20), ("50", 50), ("\u{2003}7\u{2003}", 7)] { assert_eq!(optional_reading(Some(text)), Ok(Some(value))); }
    for text in ["", "żółć", "7x"] { assert_eq!(optional_reading(Some(text)), Err(ReadingError::Syntax)); }
    for text in ["-21", "51", "32768", "-32769"] { assert_eq!(optional_reading(Some(text)), Err(ReadingError::Range)); }
}`,
};
export const rowTypes = `${configTypes}
#[derive(Debug, PartialEq)]
struct RowError { index: usize, id: String, kind: ConfigError }`;
const limitParser = configContract.solution
  .split("fn main()")[0]
  .slice(configTypes.length)
  .trim();
export const rowsContract = {
  starter: `${rowTypes}
${limitParser}
fn parse_rows<'a, I, F>(rows: I, mut observed: F) -> Result<Vec<u16>, RowError>
where I: IntoIterator<Item = (&'a str, &'a str)>, F: FnMut(&str) { Ok(Vec::new()) }
fn main() {}`,
  solution: `${rowTypes}
${limitParser}
fn parse_rows<'a, I, F>(rows: I, mut observed: F) -> Result<Vec<u16>, RowError>
where I: IntoIterator<Item = (&'a str, &'a str)>, F: FnMut(&str) {
    rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        parse_limit(Some(text)).map_err(|kind| RowError { index, id: id.to_string(), kind })
    }).collect::<Result<Vec<_>, _>>()
}
fn main() {}`,
  tests: `#[test]
fn rows_preserve_order_duplicates_zero_and_owners() {
    let owner = String::from("\u{2003}7\u{2003}");
    let rows = [("żółć", "0"), ("a", owner.as_str()), ("żółć", "0"), ("b", "1000")];
    let mut observed = Vec::new();
    assert_eq!(parse_rows(rows, |id| observed.push(id.to_string())), Ok(vec![0, 7, 0, 1000]));
    assert_eq!(observed, ["żółć", "a", "żółć", "b"]);
    assert_eq!(owner, "\u{2003}7\u{2003}");
    assert_eq!(parse_rows([], |_| panic!("empty callback")), Ok(vec![]));
}
#[test]
fn rows_report_first_error_identity_without_requesting_a_later_item() {
    for failure in 0..3 {
        for (text, kind) in [("", ConfigError::Syntax), ("1001", ConfigError::Range)] {
            let mut rows = [("pierwszy", "7"), ("Łódź", "0"), ("ostatni", "1")];
            rows[failure].1 = text;
            let mut requested = 0;
            let mut observed = Vec::new();
            let result = parse_rows(rows.into_iter().inspect(|_| requested += 1), |id| observed.push(id.to_string()));
            assert_eq!(result, Err(RowError { index: failure, id: rows[failure].0.to_string(), kind }));
            assert_eq!(requested, failure + 1, "source overconsumed");
            assert_eq!(observed, rows[..=failure].iter().map(|r| r.0.to_string()).collect::<Vec<_>>());
        }
    }
    assert_eq!(parse_rows([("a", "bad"), ("b", "1001")], |_| {}), Err(RowError { index: 0, id: "a".into(), kind: ConfigError::Syntax }));
}`,
};
export const readingsTypes = `${readingTypes}
#[derive(Debug, PartialEq)]
struct ReadingRowError { index: usize, id: String, kind: ReadingError }`;
const readingParser = optionalReadingContract.solution
  .split("fn main()")[0]
  .slice(readingTypes.length)
  .trim();
export const readingsContract = {
  starter: `${readingsTypes}
${readingParser}
fn parse_readings<'a, I, F>(rows: I, mut observed: F) -> Result<Vec<Option<i16>>, ReadingRowError>
where I: IntoIterator<Item = (&'a str, Option<&'a str>)>, F: FnMut(&str) { Ok(vec![]) }
fn main() {}`,
  solution: `${readingsTypes}
${readingParser}
fn parse_readings<'a, I, F>(rows: I, mut observed: F) -> Result<Vec<Option<i16>>, ReadingRowError>
where I: IntoIterator<Item = (&'a str, Option<&'a str>)>, F: FnMut(&str) {
    rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        optional_reading(text).map_err(|kind| ReadingRowError { index, id: id.to_string(), kind })
    }).collect()
}
fn main() {}`,
  tests: `#[test]
fn readings_preserve_absence_zero_order_and_duplicate_ids() {
    let owner = String::from("\u{2003}-20\u{2003}");
    let mut observed = Vec::new();
    assert_eq!(parse_readings([("a", None), ("a", Some("0")), ("Łódź", Some(owner.as_str())), ("b", Some("50")), ("a", None)], |id| observed.push(id.to_string())), Ok(vec![None, Some(0), Some(-20), Some(50), None]));
    assert_eq!(observed, ["a", "a", "Łódź", "b", "a"]);
    assert_eq!(owner, "\u{2003}-20\u{2003}");
    assert_eq!(parse_readings([], |_| panic!("empty callback")), Ok(vec![]));
}
#[test]
fn readings_reject_present_errors_at_first_middle_last_and_stop_requests() {
    for failure in 0..3 {
        for (text, kind) in [("żółć", ReadingError::Syntax), ("", ReadingError::Syntax), ("51", ReadingError::Range), ("-21", ReadingError::Range)] {
            let mut rows = [("a", None), ("Łódź", Some("0")), ("c", Some("50"))];
            rows[failure].1 = Some(text);
            let mut requested = 0;
            let mut observed = Vec::new();
            let result = parse_readings(rows.into_iter().inspect(|_| requested += 1), |id| observed.push(id.to_string()));
            assert_eq!(result, Err(ReadingRowError { index: failure, id: rows[failure].0.to_string(), kind }));
            assert_eq!(requested, failure + 1);
            assert_eq!(observed.len(), failure + 1);
        }
    }
}`,
};
export const retryReviewContract = {
  starter: `fn retry_delay(input: Result<u16, &str>) -> Result<u16, String> { Ok(0) }
fn main() {}`,
  solution: `fn retry_delay(input: Result<u16, &str>) -> Result<u16, String> {
    input.map_err(|message| format!("transport: {message}"))
        .and_then(|delay| if delay <= 30 { Ok(delay * 2) } else { Err(String::from("delay-range")) })
}
fn main() {}`,
  tests: `#[test]
fn retry_delay_keeps_transport_error_and_validates_before_doubling() {
    assert_eq!(retry_delay(Err("offline")), Err(String::from("transport: offline")));
    assert_eq!(retry_delay(Err("żółć")), Err(String::from("transport: żółć")));
    assert_eq!(retry_delay(Ok(0)), Ok(0));
    assert_eq!(retry_delay(Ok(7)), Ok(14));
    assert_eq!(retry_delay(Ok(30)), Ok(60));
    assert_eq!(retry_delay(Ok(31)), Err(String::from("delay-range")));
    assert_eq!(retry_delay(Ok(u16::MAX)), Err(String::from("delay-range")));
}`,
};
export const flagsReviewContract = {
  starter: `fn parse_flags(rows: &[(&str, Option<&str>)]) -> Result<Vec<Option<bool>>, String> { Ok(vec![]) }
fn main() {}`,
  solution: `fn parse_flags(rows: &[(&str, Option<&str>)]) -> Result<Vec<Option<bool>>, String> {
    rows.iter().map(|(id, text)| match text {
        None => Ok(None),
        Some(text) => match text.trim() {
            "yes" => Ok(Some(true)), "no" => Ok(Some(false)),
            _ => Err(format!("flag: {id}")),
        }
    }).collect()
}
fn main() {}`,
  tests: `#[test]
fn flags_preserve_absence_false_order_and_first_error_id() {
    assert_eq!(parse_flags(&[]), Ok(vec![]));
    assert_eq!(parse_flags(&[("a", None), ("a", Some("no")), ("b", Some("\u{2003}yes\u{2003}")), ("a", Some("no"))]), Ok(vec![None, Some(false), Some(true), Some(false)]));
    for failure in 0..3 {
        let mut rows = [("a", Some("yes")), ("Łódź", None), ("c", Some("no"))];
        rows[failure].1 = Some("");
        assert_eq!(parse_flags(&rows), Err(format!("flag: {}", rows[failure].0)));
    }
    assert_eq!(parse_flags(&[("żółć", Some("maybe")), ("b", Some("bad"))]), Err(String::from("flag: żółć")));
}`,
};
