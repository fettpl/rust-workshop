import type { LessonStep } from "@/domain/types";

export const fuzzOracleBatchRecovery: LessonStep = {
  id: "fuzz-oracle-batch-mismatches-transfer",
  kind: "apply",
  title: "Zgłoś wszystkie różniące się przypadki oracle",
  prompt:
    "Napisz `fn mismatch_indices(actual: &[CaseOutput], expected: &[CaseOutput]) -> Vec<usize>`, gdzie `type CaseOutput = Result<Vec<(usize, String, bool)>, (String, String)>`. Każda pozycja jest wynikiem osobnego przypadku; Ok zawiera wiersze (numer, pełny tekst, matched), a Err — (klasę błędu, szczegół). Zwróć rosnące indeksy od zera wszystkich różnic. Porównuj długość, kolejność, powtórzenia i każde pole wiersza, rozróżniaj Ok/Err oraz klasę i szczegół Err. Brak pozycji po jednej stronie też jest różnicą. Dwie puste partie dają pusty Vec; nie kończ po pierwszej różnicy, nie sortuj i nie usuwaj powtórzeń.",
  code: `type CaseOutput = Result<Vec<(usize, String, bool)>, (String, String)>;
fn mismatch_indices(actual: &[CaseOutput], expected: &[CaseOutput]) -> Vec<usize> {
    Vec::new()
}`,
  solution: `type CaseOutput = Result<Vec<(usize, String, bool)>, (String, String)>;
fn mismatch_indices(actual: &[CaseOutput], expected: &[CaseOutput]) -> Vec<usize> {
    let mut mismatches = Vec::new();
    for index in 0..actual.len().max(expected.len()) {
        let mut different = false;
        match (actual.get(index), expected.get(index)) {
            (Some(Ok(rows)), Some(Ok(other_rows))) => {
                if rows.len() != other_rows.len() {
                    different = true;
                }
                for (row, other_row) in rows.iter().zip(other_rows) {
                    if row.0 != other_row.0 || row.1 != other_row.1 || row.2 != other_row.2 {
                        different = true;
                    }
                }
            }
            (Some(Err((class, detail))), Some(Err((other_class, other_detail)))) => {
                if class != other_class || detail != other_detail {
                    different = true;
                }
            }
            (None, None) => (),
            _ => different = true,
        }
        if different {
            mismatches.push(index);
        }
    }
    mismatches
}`,
  evaluator: {
    kind: "tests",
    tests: `fn rows() -> Vec<(usize, String, bool)> {
    vec![(2, String::from("ż"), true), (2, String::from("ż"), true), (1, String::from("🙂"), false)]
}
fn failure(class: &str, detail: &str) -> CaseOutput {
    Err((class.to_owned(), detail.to_owned()))
}
#[test] fn compares_every_row_field_order_and_duplicate() {
    let expected = vec![Ok(rows())];
    assert!(mismatch_indices(&expected, &expected).is_empty());
    let mut number = rows(); number[0].0 = 7;
    let mut text = rows(); text[0].1 = String::from("ź");
    let mut matched = rows(); matched[0].2 = false;
    let mut reordered = rows(); reordered.reverse();
    let mut deduplicated = rows(); deduplicated.dedup();
    for changed in [number, text, matched, reordered, deduplicated, Vec::new()] {
        assert_eq!(mismatch_indices(&[Ok(changed)], &expected), vec![0]);
    }
}
#[test] fn compares_success_error_class_and_error_detail() {
    let expected = [failure("parse", "invalid body")];
    assert!(mismatch_indices(&expected, &expected).is_empty());
    for changed in [failure("limit", "invalid body"), failure("parse", "invalid query"), Ok(Vec::new())] {
        assert_eq!(mismatch_indices(&[changed], &expected), vec![0]);
    }
    assert_eq!(mismatch_indices(&[Ok(Vec::new())], &[failure("parse", "")]), vec![0]);
}
#[test] fn reports_all_case_indices_including_both_missing_tails() {
    assert!(mismatch_indices(&[], &[]).is_empty());
    let actual = [Ok(rows()), failure("parse", "body"), Ok(Vec::new())];
    let mut changed = rows(); changed[2].2 = true;
    let expected = [Ok(changed), failure("parse", "query")];
    assert_eq!(mismatch_indices(&actual, &expected), vec![0, 1, 2]);
    assert_eq!(mismatch_indices(&expected, &actual), vec![0, 1, 2]);
    assert_eq!(mismatch_indices(&actual[..1], &actual), vec![1, 2]);
    assert_eq!(mismatch_indices(&actual, &actual[..1]), vec![1, 2]);
}`,
  },
  evidenceKind: "transfer",
  evidenceGate: true,
  expectedStatus: "success",
  hints: [
    "Sprawdź wszystkie indeksy do większej długości partii. get pozwala zauważyć brak pozycji.",
    "Dla Ok sprawdź długości i każdą parę wierszy; dla Err porównaj oddzielnie klasę i szczegół. Dopisz indeks każdej różnicy.",
  ],
};
