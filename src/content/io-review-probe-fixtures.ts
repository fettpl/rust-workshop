export const shortReviewProbeFixtures = {
  "review-io-format-flag-probe-v1": {
    alternate: `#[derive(Debug, PartialEq, Eq)]
enum FlagError { Invalid }
fn parse_done_flag(text: &str) -> Result<bool, FlagError> {
    if text == "0" { Ok(false) }
    else if text == "1" { Ok(true) }
    else { Err(FlagError::Invalid) }
}`,
    mutants: {
      trim: `#[derive(Debug, PartialEq, Eq)]
enum FlagError { Invalid }
fn parse_done_flag(text: &str) -> Result<bool, FlagError> {
    match text.trim() {
        "0" => Ok(false),
        "1" => Ok(true),
        _ => Err(FlagError::Invalid),
    }
}`,
    },
  },
  "review-io-missing-file-probe-v1": {
    alternate: `fn recover_missing(
    read: Result<String, std::io::Error>,
) -> Result<String, std::io::Error> {
    read.map_or_else(
        |error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                Ok(String::new())
            } else {
                Err(error)
            }
        },
        Ok,
    )
}`,
    mutants: {
      swallow: `fn recover_missing(
    read: Result<String, std::io::Error>,
) -> Result<String, std::io::Error> {
    match read {
        Ok(value) => Ok(value),
        Err(_) => Ok(String::new()),
    }
}`,
    },
  },
  "review-io-confirm-save-probe-v1": {
    alternate: `#[derive(Debug, PartialEq, Eq)]
struct SaveError { code: u32 }
fn confirmation(
    saved: Result<(), SaveError>,
    message: String,
) -> Result<String, SaveError> {
    saved.map(|_| message)
}`,
    mutants: {
      swallow: `#[derive(Debug, PartialEq, Eq)]
struct SaveError { code: u32 }
fn confirmation(
    _saved: Result<(), SaveError>,
    message: String,
) -> Result<String, SaveError> {
    Ok(message)
}`,
    },
  },
} as const;
