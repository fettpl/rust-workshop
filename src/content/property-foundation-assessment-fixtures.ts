/**
 * Independent, repository-authored fixtures for the property foundations gates.
 * These variants exercise the production evaluator against real Rust binaries;
 * they never accept learner paths or execute imported code.
 */

const invariantGateEquivalent = `fn assert_selection_property(
    candidate: fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>,
) {
    fn oracle(lines: &[&str], query: &str, context: usize) -> Vec<(usize, String, bool)> {
        lines.iter().enumerate().filter_map(|(index, line)| {
            let selected = lines.iter().enumerate().any(|(match_index, value)| {
                value.contains(query) && index.abs_diff(match_index) <= context
            });
            selected.then(|| (index, (*line).to_owned(), line.contains(query)))
        }).collect()
    }
    let cases: &[(&[&str], &str, usize)] = &[
        (&[], "Rust", 0),
        (&["zero", "Rust", "koniec"], "Rust", 0),
        (&["Rust", "Rust", "x"], "Rust", 0),
        (&["początek", "środek", "Rust 🙂", "koniec"], "Rust", 1),
        (&["ala", "ma", "kota"], "brak", 2),
        (&["a", "Rust", "b", "Rust", "c"], "Rust", 1),
    ];
    for (lines, query, context) in cases {
        assert_eq!(candidate(lines, query, *context), oracle(lines, query, *context));
    }
}`;

const invariantGateMutant = invariantGateEquivalent.replace(
  "value.contains(query) && index.abs_diff(match_index) <= context",
  "value.contains(query) && index == match_index",
);

const invariantBlankEquivalent = `#[derive(Debug, PartialEq, Eq)]
struct SelectionEvent { line_number: usize, text: String, matched: bool }
fn assert_event_selection_property(
    candidate: fn(&[&str], &str, usize) -> Vec<SelectionEvent>,
) {
    for (lines, query, context) in [
        (&["Rust", "dalej"][..], "Rust", 0),
        (&["przed", "Rust", "po"][..], "Rust", 1),
        (&["a", "b"][..], "x", 1),
        (&["🙂 Rust", "Rust"][..], "Rust", 0),
    ] {
        let expected = lines.iter().enumerate().filter_map(|(index, line)| {
            let selected = lines.iter().enumerate().any(|(match_index, value)| {
                value.contains(query) && index.abs_diff(match_index) <= context
            });
            selected.then(|| SelectionEvent {
                line_number: index,
                text: (*line).to_owned(),
                matched: line.contains(query),
            })
        }).collect::<Vec<_>>();
        assert_eq!(candidate(lines, query, context), expected);
    }
}`;

const invariantBlankMutant = invariantBlankEquivalent.replace(
  "selected.then(|| SelectionEvent {\n                line_number: index,\n                text: (*line).to_owned(),\n                matched: line.contains(query),\n            })",
  "selected.then(|| SelectionEvent {\n                line_number: index + 1,\n                text: (*line).to_owned(),\n                matched: line.contains(query),\n            })",
);

const generatedGateEquivalent = `fn assert_log_summary_property(
    candidate: fn(&[&str], Option<&str>) -> (usize, usize, usize, usize),
) {
    let cases = [
        (&[][..], None, (0, 0, 0, 0)),
        (&["0 INFO start", "1 WARN retry", "2 ERROR żółć 🙂"][..], None, (1, 1, 1, 0)),
        (&["0 INFO start", "bad INFO broken", "1 ERROR stop"][..], Some("ERROR"), (0, 0, 1, 1)),
        (&["0 INFO a", "1 INFO b", "2 WARN c", "3 TRACE d", "x ERROR e"][..], Some("INFO"), (2, 0, 0, 2)),
        (&["0 WARN ", "1 WARN retry", "2 ERROR ok"][..], None, (0, 1, 1, 1)),
    ];
    for (records, filter, expected) in cases {
        assert_eq!(candidate(records, filter), expected);
    }
}`;

const generatedGateMutant = generatedGateEquivalent.replace(
  "assert_eq!(candidate(records, filter), expected);",
  "let mut actual = candidate(records, filter);\n        if filter.is_some() { actual.3 = 0; }\n        assert_eq!(actual, expected);",
);

const generatedBlankEquivalent = `fn generate_reading_cases(seed: u64) -> Vec<String> {
    let samples = [
        "0|C|start", "1|kPa|ciśnienie 🙂", "bad|C|broken", "2|F|wrong unit", "3|C|   ",
    ];
    let offset = (seed as usize) % samples.len();
    samples.iter().cycle().skip(offset).take(samples.len()).map(|case| (*case).to_owned()).collect()
}
fn assert_reading_generator_contract(generator: fn(u64) -> Vec<String>) {
    for seed in [0, 1, 17, 64] {
        let first = generator(seed);
        assert_eq!(first, generator(seed));
        assert!(first.len() <= 24);
        let (valid, invalid) = first.into_iter().fold((0, 0), |(valid, invalid), case| {
            let fields: Vec<_> = case.splitn(3, '|').collect();
            let ok = fields.len() == 3
                && !fields[0].is_empty()
                && fields[0].bytes().all(|byte| byte.is_ascii_digit())
                && matches!(fields[1], "C" | "kPa")
                && !fields[2].trim().is_empty();
            if ok { (valid + 1, invalid) } else { (valid, invalid + 1) }
        });
        assert!(valid > 0 && invalid > 0);
    }
}`;

const generatedBlankMutant = generatedBlankEquivalent.replace(
  '"0|C|start", "1|kPa|ciśnienie 🙂", "bad|C|broken", "2|F|wrong unit", "3|C|   "',
  '"0|C|start", "1|kPa|ciśnienie 🙂"',
);

const invariantReviewEquivalent = `fn assert_occurrence_property(candidate: fn(&[i32], i32) -> Vec<usize>) {
    for (values, needle, expected) in [(&[][..], 2, &[][..]), (&[2, 1, 2][..], 2, &[0, 2][..]), (&[4, 4][..], 4, &[0, 1][..])] {
        let actual: Vec<_> = values.iter().enumerate().filter_map(|(index, value)| (*value == needle).then_some(index)).collect();
        assert_eq!(candidate(values, needle), actual);
        assert_eq!(actual.as_slice(), expected);
    }
}`;

const invariantReviewMutant = invariantReviewEquivalent.replace(
  "values.iter().enumerate().filter_map(|(index, value)| (*value == needle).then_some(index)).collect()",
  "values.iter().position(|value| *value == needle).into_iter().collect()",
);

const generatedReviewEquivalent = `fn assert_partition_property(candidate: fn(&[&str]) -> (usize, usize)) {
    for (records, expected) in [
        (&[][..], (0, 0)),
        (&["0|C|ok", "bad|C|x", "1|kPa|🙂"][..], (2, 1)),
        (&["2|F|x", "3|C|   "][..], (0, 2)),
    ] {
        let actual = records.iter().fold((0, 0), |(valid, invalid), record| {
            let fields: Vec<_> = record.splitn(3, '|').collect();
            let valid_record = fields.len() == 3 && !fields[0].is_empty()
                && fields[0].bytes().all(|byte| byte.is_ascii_digit())
                && matches!(fields[1], "C" | "kPa") && !fields[2].trim().is_empty();
            if valid_record { (valid + 1, invalid) } else { (valid, invalid + 1) }
        });
        assert_eq!(actual, expected);
        assert_eq!(candidate(records), actual);
    }
}`;

const generatedReviewMutant = generatedReviewEquivalent.replace(
  "if valid_record { (valid + 1, invalid) } else { (valid, invalid + 1) }",
  "if valid_record { (valid + 1, invalid) } else { (valid, invalid) }",
);

export const propertyFoundationAssessmentFixtures = [
  {
    id: "property-invariants-gate",
    equivalent: invariantGateEquivalent,
    mutant: invariantGateMutant,
  },
  {
    id: "property-invariants-blank",
    equivalent: invariantBlankEquivalent,
    mutant: invariantBlankMutant,
  },
  {
    id: "property-generated-inputs-gate",
    equivalent: generatedGateEquivalent,
    mutant: generatedGateMutant,
  },
  {
    id: "property-generated-inputs-blank",
    equivalent: generatedBlankEquivalent,
    mutant: generatedBlankMutant,
  },
  {
    id: "property-invariant-contracts-review",
    equivalent: invariantReviewEquivalent,
    mutant: invariantReviewMutant,
  },
  {
    id: "property-generated-inputs-review",
    equivalent: generatedReviewEquivalent,
    mutant: generatedReviewMutant,
  },
] as const;
