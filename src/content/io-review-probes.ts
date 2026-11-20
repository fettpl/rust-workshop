import type { LessonStep } from "@/domain/types";

const formatStarter = `#[derive(Debug, PartialEq, Eq)]
enum FlagError { Invalid }
fn parse_done_flag(text: &str) -> Result<bool, FlagError> {
    Err(FlagError::Invalid)
}`;

const formatSolution = `#[derive(Debug, PartialEq, Eq)]
enum FlagError { Invalid }
fn parse_done_flag(text: &str) -> Result<bool, FlagError> {
    match text {
        "0" => Ok(false),
        "1" => Ok(true),
        _ => Err(FlagError::Invalid),
    }
}`;

const formatTests = `#[test]
fn accepts_only_the_two_exact_flags() {
    assert_eq!(parse_done_flag("0"), Ok(false));
    assert_eq!(parse_done_flag("1"), Ok(true));
}

#[test]
fn rejects_other_text_without_trimming() {
    for value in ["", " ", " 0", "1 ", "\\t1", "01", "true", "１", "\\n"] {
        assert_eq!(parse_done_flag(value), Err(FlagError::Invalid), "{value:?}");
    }
}`;

const missingFileStarter = `fn recover_missing(
    read: Result<String, std::io::Error>,
) -> Result<String, std::io::Error> {
    read
}`;

const missingFileSolution = `fn recover_missing(
    read: Result<String, std::io::Error>,
) -> Result<String, std::io::Error> {
    match read {
        Ok(value) => Ok(value),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(String::new())
        }
        Err(error) => Err(error),
    }
}`;

const missingFileTests = `#[derive(Debug)]
struct Marker;
impl std::fmt::Display for Marker {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "marker detail")
    }
}
impl std::error::Error for Marker {}

#[test]
fn preserves_successful_text_exactly() {
    let value = String::from("  dane|λ  ");
    match recover_missing(Ok(value.clone())) {
        Ok(actual) => assert_eq!(actual, value),
        Err(_) => panic!("successful text must stay successful"),
    }
}

#[test]
fn recovers_only_a_missing_file() {
    let missing = std::io::Error::new(std::io::ErrorKind::NotFound, "missing");
    match recover_missing(Err(missing)) {
        Ok(actual) => assert!(actual.is_empty()),
        Err(_) => panic!("missing file should become empty text"),
    }
}

#[test]
fn preserves_other_errors() {
    for kind in [
        std::io::ErrorKind::PermissionDenied,
        std::io::ErrorKind::InvalidData,
    ] {
        let error = std::io::Error::new(kind, "kept detail");
        let result = recover_missing(Err(error));
        match result {
            Err(returned) => {
                assert_eq!(returned.kind(), kind);
                assert_eq!(returned.to_string(), "kept detail");
            }
            Ok(_) => panic!("non-missing errors must propagate"),
        }
    }
}

#[test]
fn preserves_the_original_error_object() {
    let result = recover_missing(Err(std::io::Error::new(
        std::io::ErrorKind::InvalidData,
        Marker,
    )));
    match result {
        Err(returned) => assert!(
            returned
                .get_ref()
                .and_then(|inner| inner.downcast_ref::<Marker>())
                .is_some()
        ),
        Ok(_) => panic!("the original error object must be returned"),
    }
}`;

const saveStarter = `#[derive(Debug, PartialEq, Eq)]
struct SaveError { code: u32 }
fn confirmation(
    saved: Result<(), SaveError>,
    _message: String,
) -> Result<String, SaveError> {
    saved.map(|_| String::new())
}`;

const saveSolution = `#[derive(Debug, PartialEq, Eq)]
struct SaveError { code: u32 }
fn confirmation(
    saved: Result<(), SaveError>,
    message: String,
) -> Result<String, SaveError> {
    match saved {
        Ok(()) => Ok(message),
        Err(error) => Err(error),
    }
}`;

const saveTests = `#[test]
fn returns_the_original_message_only_after_success() {
    for message in ["", "  zapis | λ  "] {
        assert_eq!(
            confirmation(Ok(()), String::from(message)),
            Ok(String::from(message)),
        );
    }
}

#[test]
fn preserves_each_save_error() {
    for code in [7, 42] {
        let result = confirmation(
            Err(SaveError { code }),
            String::from("nie zapisano"),
        );
        assert_eq!(result, Err(SaveError { code }));
    }
}`;

function probe(
  id: string,
  conceptId: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  tests: string,
  hints: [string, string],
  explanation: string,
): LessonStep {
  return {
    id,
    reviewPurpose: "practice-probe",
    kind: "modify",
    title,
    prompt,
    code,
    solution,
    hints,
    explanation,
    evaluator: { kind: "tests", tests },
    expectedStatus: "success",
    evidenceKind: "exposure",
    evidenceGate: false,
    evidence: { version: 1, conceptIds: [conceptId] },
    trustedFixtureTarget: "rustc-2024",
  };
}

export const shortReviewExercises: Record<string, LessonStep> = {
  "io-format-roundtrip": probe(
    "review-io-format-flag-probe-v1",
    "io-format-roundtrip",
    "Rozpoznaj dokładną flagę zakończenia",
    "Napisz `parse_done_flag(text: &str) -> Result<bool, FlagError>`. Zwróć false tylko dla dokładnego `0`, true tylko dla dokładnego `1`, a dla każdego innego tekstu `FlagError::Invalid`. Nie usuwaj spacji ani znaków końca wiersza.",
    formatStarter,
    formatSolution,
    formatTests,
    [
      "Porównaj cały tekst z dwoma dozwolonymi napisami; nie używaj trim.",
      "Wszystkie pozostałe wartości powinny przejść do jednego wariantu Invalid.",
    ],
    "Ta granica rozpoznaje ścisły status. Pełny kontrakt kodowania i odczytu notatnika pozostaje w dłuższym ćwiczeniu.",
  ),
  "io-safe-persistence": probe(
    "review-io-missing-file-probe-v1",
    "io-safe-persistence",
    "Odróżnij brak pliku od awarii",
    "Napisz `recover_missing(read: Result<String, std::io::Error>) -> Result<String, std::io::Error>`. Zachowaj każdy udany tekst, zamień tylko `ErrorKind::NotFound` na pusty String, a każdy inny błąd zwróć bez zmiany.",
    missingFileStarter,
    missingFileSolution,
    missingFileTests,
    [
      "Sprawdź `error.kind()` przed decyzją; nie przechwytuj wszystkich błędów razem.",
      "W gałęzi innej niż NotFound zwróć ten sam obiekt błędu przez Err(error).",
    ],
    "To ćwiczenie przypomina pojedynczą decyzję odzyskiwania. Zapis tymczasowy, synchronizacja i zmiana nazwy należą do pełnego kontraktu.",
  ),
  "io-terminal-boundary": probe(
    "review-io-confirm-save-probe-v1",
    "io-terminal-boundary",
    "Potwierdź dopiero po udanym zapisie",
    "Napisz `confirmation(saved: Result<(), SaveError>, message: String) -> Result<String, SaveError>`. Zwróć dokładnie message po `Ok(())`, a przy błędzie zachowaj oryginalny `SaveError`.",
    saveStarter,
    saveSolution,
    saveTests,
    [
      "Rozdziel Ok(()) od Err(error), zanim przeniesiesz message.",
      "Sukces zwraca tę samą treść, a błąd powinien przejść przez Err bez nowego kodu.",
    ],
    "Granica potwierdza tylko wynik zapisu. Nie uruchamia polecenia terminala i nie zastępuje pełnego ćwiczenia projektu.",
  ),
};
