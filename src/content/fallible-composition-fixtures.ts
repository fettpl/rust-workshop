/** Representation-diverse positives and compiling behavioral negatives, never learner submissions. */
import {
  borrowedNumberContract as borrowed,
  configContract as config,
  optionalReadingContract as optional,
  rowsContract as rows,
  readingsContract as readings,
  retryReviewContract as retry,
  flagsReviewContract as flags,
  configTypes,
  readingTypes,
} from "./fallible-composition-contracts";
function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw new Error(`Fixture replacement missing: ${before}`);
  return source.replace(before, after);
}
const configAlternate = `${configTypes}
fn parse_limit(text: Option<&str>) -> Result<u16, ConfigError> {
    let text = match text { Some(t) => t.trim(), None => return Err(ConfigError::Missing) };
    let number = match text.parse::<u32>() {
        Ok(n) => n,
        Err(e) => return Err(match e.kind() {
            std::num::IntErrorKind::PosOverflow | std::num::IntErrorKind::NegOverflow => ConfigError::Range,
            _ => ConfigError::Syntax,
        }),
    };
    if number > 1000 { return Err(ConfigError::Range); }
    Ok(number as u16)
}
fn main() {}`;
const optionalAlternate = `${readingTypes}
fn optional_reading(text: Option<&str>) -> Result<Option<i16>, ReadingError> {
    let text = match text { None => return Ok(None), Some(t) => t.trim() };
    let number = match text.parse::<i16>() {
        Ok(n) => n,
        Err(e) => return Err(match e.kind() {
            std::num::IntErrorKind::PosOverflow | std::num::IntErrorKind::NegOverflow => ReadingError::Range,
            _ => ReadingError::Syntax,
        }),
    };
    if number < -20 || number > 50 { Err(ReadingError::Range) } else { Ok(Some(number)) }
}
fn main() {}`;
const rowsBody = `    rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        parse_limit(Some(text)).map_err(|kind| RowError { index, id: id.to_string(), kind })
    }).collect::<Result<Vec<_>, _>>()`;
const readingsBody = `    rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        optional_reading(text).map_err(|kind| ReadingRowError { index, id: id.to_string(), kind })
    }).collect()`;
const rowsAlternate = replace(
  rows.solution,
  rowsBody,
  `    let mut output = Vec::new();
    for (index, (id, text)) in rows.into_iter().enumerate() {
        observed(id);
        match parse_limit(Some(text)) {
            Ok(value) => output.push(value),
            Err(kind) => return Err(RowError { index, id: String::from(id), kind }),
        }
    }
    Ok(output)`,
);
const readingsAlternate = replace(
  readings.solution,
  readingsBody,
  `    let mut output = vec![];
    for (index, (id, text)) in rows.into_iter().enumerate() {
        observed(id);
        match optional_reading(text) {
            Ok(value) => output.push(value),
            Err(kind) => return Err(ReadingRowError { index, id: String::from(id), kind }),
        }
    }
    Ok(output)`,
);
const readingMutants = {
  missingToZero: {
    code: replace(
      readings.solution,
      "optional_reading(text).map_err",
      "optional_reading(text).map(|value| Some(value.unwrap_or(0))).map_err",
    ),
    assertion: "readings_preserve_absence_zero_order_and_duplicate_ids",
  },
  droppingErrors: {
    code: replace(
      readings.solution,
      readingsBody,
      `    Ok(rows.into_iter().filter_map(|(id, text)| { observed(id); optional_reading(text).ok() }).collect())`,
    ),
    assertion:
      "readings_reject_present_errors_at_first_middle_last_and_stop_requests",
  },
  overconsumption: {
    code: replace(
      readings.solution,
      readingsBody,
      `    let pending: Vec<_> = rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        optional_reading(text).map_err(|kind| ReadingRowError { index, id: id.to_string(), kind })
    }).collect();
    pending.into_iter().collect()`,
    ),
    assertion:
      "readings_reject_present_errors_at_first_middle_last_and_stop_requests",
  },
};
export const fallibleCompositionFixtures = [
  {
    id: "fallible-owner-repair",
    alternate: `fn borrowed_number(owner: &Option<String>) -> Option<u16> {
    match owner { Some(text) => match text.trim().parse::<u16>() { Ok(n) => Some(n), Err(_) => None }, None => None }
}
fn main() {}`,
    mutants: {
      missingToZero: {
        code: replace(
          borrowed.solution,
          "owner.as_ref().and_then",
          "Some(owner.as_ref().and_then",
        ).replace(".ok())", ".ok()).unwrap_or(0))"),
        assertion: "borrowed_number_preserves_owner_and_option_policy",
      },
    },
  },
  {
    id: "fallible-config-contract",
    alternate: configAlternate,
    mutants: {
      missingToZero: {
        code: replace(
          config.solution,
          "text.ok_or_else(|| ConfigError::Missing)",
          'text.or(Some("0")).ok_or_else(|| ConfigError::Missing)',
        ),
        assertion: "config_distinguishes_missing_zero_syntax_and_range",
      },
      overflowAsSyntax: {
        code: replace(
          config.solution,
          "std::num::IntErrorKind::NegOverflow => ConfigError::Range",
          "std::num::IntErrorKind::NegOverflow => ConfigError::Syntax",
        ),
        assertion: "config_distinguishes_missing_zero_syntax_and_range",
      },
      uncheckedRange: {
        code: replace(config.solution, "value <= 1000", "true"),
        assertion: "config_distinguishes_missing_zero_syntax_and_range",
      },
    },
  },
  {
    id: "fallible-optional-transfer",
    alternate: optionalAlternate,
    mutants: {
      swallowedError: {
        code: replace(
          optional.solution,
          ".transpose()",
          ".transpose().or(Ok(None))",
        ),
        assertion:
          "optional_reading_allows_absence_but_rejects_bad_present_text",
      },
      overflowAsSyntax: {
        code: replace(
          optional.solution,
          "std::num::IntErrorKind::NegOverflow => ReadingError::Range",
          "std::num::IntErrorKind::NegOverflow => ReadingError::Syntax",
        ),
        assertion:
          "optional_reading_allows_absence_but_rejects_bad_present_text",
      },
    },
  },
  {
    id: "fallible-rows-contract",
    alternate: rowsAlternate,
    mutants: {
      droppingErrors: {
        code: replace(
          rows.solution,
          rowsBody,
          `    Ok(rows.into_iter().filter_map(|(id, text)| { observed(id); parse_limit(Some(text)).ok() }).collect())`,
        ),
        assertion:
          "rows_report_first_error_identity_without_requesting_a_later_item",
      },
      wrongRow: {
        code: replace(
          rows.solution,
          "id: id.to_string()",
          'id: String::from("wrong")',
        ),
        assertion:
          "rows_report_first_error_identity_without_requesting_a_later_item",
      },
      wrongIndex: {
        code: replace(
          rows.solution,
          "RowError { index,",
          "RowError { index: index + 1,",
        ),
        assertion:
          "rows_report_first_error_identity_without_requesting_a_later_item",
      },
      reordering: {
        code: replace(
          rows.solution,
          rowsBody,
          `${rowsBody}.map(|mut values| { values.reverse(); values })`,
        ),
        assertion: "rows_preserve_order_duplicates_zero_and_owners",
      },
      overconsumption: {
        code: replace(
          rows.solution,
          rowsBody,
          `    let pending: Vec<_> = rows.into_iter().enumerate().map(|(index, (id, text))| {
        observed(id);
        parse_limit(Some(text)).map_err(|kind| RowError { index, id: id.to_string(), kind })
    }).collect();
    pending.into_iter().collect()`,
        ),
        assertion:
          "rows_report_first_error_identity_without_requesting_a_later_item",
      },
    },
  },
  {
    id: "fallible-readings-transfer",
    alternate: readingsAlternate,
    mutants: readingMutants,
  },
  {
    id: "fallible-readings-blank",
    alternate: readingsAlternate,
    mutants: readingMutants,
  },
  {
    id: "review-fallible-retry-delay",
    alternate: `fn retry_delay(input: Result<u16, &str>) -> Result<u16, String> {
    match input { Err(e) => Err(format!("transport: {e}")), Ok(n) if n <= 30 => Ok(n + n), Ok(_) => Err("delay-range".into()) }
}
fn main() {}`,
    mutants: {
      dropsTransportError: {
        code: replace(
          retry.solution,
          "input.map_err",
          "input.or(Ok::<u16, &str>(0)).map_err",
        ),
        assertion:
          "retry_delay_keeps_transport_error_and_validates_before_doubling",
      },
      acceptsWrongBoundary: {
        code: replace(retry.solution, "delay <= 30", "delay <= 31"),
        assertion:
          "retry_delay_keeps_transport_error_and_validates_before_doubling",
      },
    },
  },
  {
    id: "review-fallible-flags",
    alternate: `fn parse_flags(rows: &[(&str, Option<&str>)]) -> Result<Vec<Option<bool>>, String> {
    let mut output = vec![];
    for (id, text) in rows {
        let flag = match text {
            None => None,
            Some(t) if t.trim() == "yes" => Some(true),
            Some(t) if t.trim() == "no" => Some(false),
            _ => return Err(format!("flag: {id}")),
        };
        output.push(flag);
    }
    Ok(output)
}
fn main() {}`,
    mutants: {
      absenceBecomesFalse: {
        code: replace(
          flags.solution,
          "None => Ok(None)",
          "None => Ok(Some(false))",
        ),
        assertion: "flags_preserve_absence_false_order_and_first_error_id",
      },
      missingErrorIdentity: {
        code: replace(
          flags.solution,
          'format!("flag: {id}")',
          'String::from("flag")',
        ),
        assertion: "flags_preserve_absence_false_order_and_first_error_id",
      },
    },
  },
];
