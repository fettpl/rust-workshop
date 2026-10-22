import type { LessonStep } from "@/domain/types";

export const disjointRangesPrimaryStepId =
  "disjoint-regions-range-transfer" as const;
export const disjointRangesFamily = "unsafe-miri/disjoint-ranges-v1" as const;

export const disjointRangesModel = String.raw`use std::ops::Range;

fn main() {
    let buffer = [10_u8, 20, 30, 40, 50, 60];
    let forward_first: Range<usize> = 0..2;
    let forward_second: Range<usize> = 2..4;
    let first_forward = &buffer[forward_first.clone()];
    let second_forward = &buffer[forward_second.clone()];
    println!("kolejno: 0..2, następnie 2..4: {:?} {:?}", first_forward, second_forward);

    // Pierwszy argument jest dalej w buforze, ale nadal pozostaje pierwszy w krotce.
    let reversed_first: Range<usize> = 4..6;
    let reversed_second: Range<usize> = 1..3;
    let first_reversed = &buffer[reversed_first.clone()];
    let second_reversed = &buffer[reversed_second.clone()];
    println!(
        "kolejność argumentów: pierwszy 4..6, drugi 1..3: {:?} {:?}",
        first_reversed, second_reversed
    );
    println!("półotwarty zakres 0..2 zawiera indeksy 0 i 1, bez końca 2");
    println!("puste 2..2 wewnątrz 0..4: poprawne, bo nie zawiera elementu");
    println!("nakładające się 0..3 i 2..4: błąd Overlap");
}`;

const modelRunExpected =
  "kolejno: 0..2, następnie 2..4: [10, 20] [30, 40]\nkolejność argumentów: pierwszy 4..6, drugi 1..3: [50, 60] [20, 30]\npółotwarty zakres 0..2 zawiera indeksy 0 i 1, bez końca 2\npuste 2..2 wewnątrz 0..4: poprawne, bo nie zawiera elementu\nnakładające się 0..3 i 2..4: błąd Overlap\n";

export const disjointRangesSolution = String.raw`#![forbid(unsafe_code)]
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError {
    FirstInvalid,
    SecondInvalid,
    Overlap,
}

fn valid_range(range: &Range<usize>, length: usize) -> bool {
    range.start <= range.end && range.end <= length
}

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError> {
    if !valid_range(&first, buffer.len()) {
        return Err(RangeError::FirstInvalid);
    }
    if !valid_range(&second, buffer.len()) {
        return Err(RangeError::SecondInvalid);
    }
    if first.start < first.end
        && second.start < second.end
        && first.start < second.end
        && second.start < first.end
    {
        return Err(RangeError::Overlap);
    }

    if first.start == first.end && second.start == second.end {
        return Ok((&mut [], &mut []));
    }
    if first.start == first.end {
        let (_, tail) = buffer.split_at_mut(second.start);
        let (selected, _) = tail.split_at_mut(second.end - second.start);
        return Ok((&mut [], selected));
    }
    if second.start == second.end {
        let (_, tail) = buffer.split_at_mut(first.start);
        let (selected, _) = tail.split_at_mut(first.end - first.start);
        return Ok((selected, &mut []));
    }

    let (first_slice, second_slice) = if first.start <= second.start {
        let (_, after_first_start) = buffer.split_at_mut(first.start);
        let (first_slice, after_first) =
            after_first_start.split_at_mut(first.end - first.start);
        let (_, after_second_start) =
            after_first.split_at_mut(second.start - first.end);
        let (second_slice, _) =
            after_second_start.split_at_mut(second.end - second.start);
        (first_slice, second_slice)
    } else {
        let (_, after_second_start) = buffer.split_at_mut(second.start);
        let (second_slice, after_second) =
            after_second_start.split_at_mut(second.end - second.start);
        let (_, after_first_start) =
            after_second.split_at_mut(first.start - second.end);
        let (first_slice, _) =
            after_first_start.split_at_mut(first.end - first.start);
        (first_slice, second_slice)
    };

    Ok((first_slice, second_slice))
}
`;

export const disjointRangesEquivalent = String.raw`#![forbid(unsafe_code)]
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError {
    FirstInvalid,
    SecondInvalid,
    Overlap,
}

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError> {
    let length = buffer.len();
    if first.start > first.end || first.end > length {
        return Err(RangeError::FirstInvalid);
    }
    if second.start > second.end || second.end > length {
        return Err(RangeError::SecondInvalid);
    }
    let first_nonempty = first.start != first.end;
    let second_nonempty = second.start != second.end;
    if first_nonempty
        && second_nonempty
        && (first.start < second.end && second.start < first.end)
    {
        return Err(RangeError::Overlap);
    }
    if first.start == first.end {
        if second.start == second.end {
            return Ok((&mut [], &mut []));
        }
        let (_, tail) = buffer.split_at_mut(second.start);
        let (value, _) = tail.split_at_mut(second.end - second.start);
        return Ok((&mut [], value));
    }
    if second.start == second.end {
        let (_, tail) = buffer.split_at_mut(first.start);
        let (value, _) = tail.split_at_mut(first.end - first.start);
        return Ok((value, &mut []));
    }
    let first_is_low = first.start < second.start;
    let (low, high) = if first_is_low { (first, second) } else { (second, first) };
    let (_, tail) = buffer.split_at_mut(low.start);
    let (low_slice, after_low) = tail.split_at_mut(low.end - low.start);
    let (_, tail) = after_low.split_at_mut(high.start - low.end);
    let (high_slice, _) = tail.split_at_mut(high.end - high.start);
    if first_is_low { Ok((low_slice, high_slice)) } else { Ok((high_slice, low_slice)) }
}
`;

export const disjointRangesThird = String.raw`#![forbid(unsafe_code)]
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError { FirstInvalid, SecondInvalid, Overlap }

fn valid(range: &Range<usize>, length: usize) -> bool {
    range.start <= range.end && range.end <= length
}

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError> {
    if !valid(&first, buffer.len()) { return Err(RangeError::FirstInvalid); }
    if !valid(&second, buffer.len()) { return Err(RangeError::SecondInvalid); }
    let first_nonempty = first.start < first.end;
    let second_nonempty = second.start < second.end;
    if first_nonempty && second_nonempty
        && first.start < second.end && second.start < first.end
    { return Err(RangeError::Overlap); }
    if !first_nonempty {
        if !second_nonempty { return Ok((&mut [], &mut [])); }
        return Ok((&mut [], &mut buffer[second.start..second.end]));
    }
    if !second_nonempty {
        return Ok((&mut buffer[first.start..first.end], &mut []));
    }
    let first_is_low = first.start < second.start;
    let (low_start, low_end, high_start, high_end) = if first_is_low {
        (first.start, first.end, second.start, second.end)
    } else {
        (second.start, second.end, first.start, first.end)
    };
    let (before_high, high_and_rest) = buffer.split_at_mut(high_start);
    let low_slice = &mut before_high[low_start..low_end];
    let high_slice = &mut high_and_rest[..high_end - high_start];
    if first_is_low { Ok((low_slice, high_slice)) } else { Ok((high_slice, low_slice)) }
}
`;

export const disjointRangesVariants = {
  canonical: disjointRangesSolution,
  equivalent: disjointRangesEquivalent,
  third: disjointRangesThird,
} as const;

export const disjointRangesStarter = String.raw`#![forbid(unsafe_code)]
use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
pub enum RangeError { FirstInvalid, SecondInvalid, Overlap }

pub fn select_regions<'a>(
    buffer: &'a mut [u8],
    first: Range<usize>,
    second: Range<usize>,
) -> Result<(&'a mut [u8], &'a mut [u8]), RangeError> {
    if first.start >= first.end || first.end >= buffer.len() {
        return Err(RangeError::FirstInvalid);
    }
    if second.start >= second.end || second.end >= buffer.len() {
        return Err(RangeError::SecondInvalid);
    }
    if first.start < second.end && second.start < first.end {
        return Err(RangeError::Overlap);
    }
    Ok((&mut [], &mut []))
}
`;

const swappedTupleMutant = disjointRangesSolution.replace(
  "Ok((first_slice, second_slice))",
  "Ok((second_slice, first_slice))",
);
const eagerOverlapMutant = disjointRangesSolution.replace(
  "if first.start < first.end\n        && second.start < second.end\n        && first.start < second.end\n        && second.start < first.end",
  "if first.start <= first.end\n        && second.start <= second.end\n        && first.start < second.end\n        && second.start < first.end",
);
const acceptsOverlapAsEmptyMutant = disjointRangesSolution.replace(
  "return Err(RangeError::Overlap);",
  "return Ok((&mut [], &mut []));",
);
const offByOneBoundsMutant = disjointRangesSolution.replace(
  "range.end <= length",
  "range.end < length",
);
const malformedRangeMutant = disjointRangesSolution.replace(
  "if !valid_range(&first, buffer.len()) {\n        return Err(RangeError::FirstInvalid);\n    }",
  "if first.start > first.end {\n        return Ok((&mut [], &mut []));\n    }\n    if !valid_range(&first, buffer.len()) {\n        return Err(RangeError::FirstInvalid);\n    }",
);
const mutateBeforeErrorMutant = disjointRangesSolution.replace(
  "if !valid_range(&first, buffer.len()) {",
  "if !valid_range(&first, buffer.len()) {\n        if !buffer.is_empty() { buffer[0] = 0xEE; }",
);
const wrongLengthMutant = disjointRangesSolution.replace(
  "Ok((first_slice, second_slice))",
  "let first_slice_len = first_slice.len();\n    Ok((&mut first_slice[..first_slice_len.saturating_sub(1)], second_slice))",
);

export const disjointRangesMutants = {
  swappedTuple: swappedTupleMutant,
  eagerOverlap: eagerOverlapMutant,
  acceptsOverlapAsEmpty: acceptsOverlapAsEmptyMutant,
  offByOneBounds: offByOneBoundsMutant,
  malformedRangeAcceptance: malformedRangeMutant,
  mutateBeforeError: mutateBeforeErrorMutant,
  incorrectLength: wrongLengthMutant,
} as const;

export const disjointRangesMutantTargets = {
  swappedTuple:
    "__rust_workshop_hidden_tests::valid_regions_preserve_lengths_identity_order_and_mutation_visibility",
  eagerOverlap:
    "__rust_workshop_hidden_tests::empty_ranges_are_valid_at_boundaries_and_interior",
  acceptsOverlapAsEmpty:
    "__rust_workshop_hidden_tests::errors_have_ordered_precedence_and_never_mutate",
  offByOneBounds:
    "__rust_workshop_hidden_tests::adjacent_gapped_and_full_ranges_are_valid",
  malformedRangeAcceptance:
    "__rust_workshop_hidden_tests::errors_have_ordered_precedence_and_never_mutate",
  mutateBeforeError:
    "__rust_workshop_hidden_tests::errors_have_ordered_precedence_and_never_mutate",
  incorrectLength:
    "__rust_workshop_hidden_tests::valid_regions_preserve_lengths_identity_order_and_mutation_visibility",
} as const;

export const disjointRangesTests = String.raw`fn expected_result(
    length: usize,
    first: std::ops::Range<usize>,
    second: std::ops::Range<usize>,
) -> Result<(), RangeError> {
    if first.start > first.end || first.end > length {
        return Err(RangeError::FirstInvalid);
    }
    if second.start > second.end || second.end > length {
        return Err(RangeError::SecondInvalid);
    }
    let first_elements: Vec<usize> = (0..length)
        .filter(|index| first.start <= *index && *index < first.end)
        .collect();
    let second_elements: Vec<usize> = (0..length)
        .filter(|index| second.start <= *index && *index < second.end)
        .collect();
    if first_elements.iter().any(|index| second_elements.contains(index)) {
        return Err(RangeError::Overlap);
    }
    Ok(())
}

fn check_case(length: usize, first: std::ops::Range<usize>, second: std::ops::Range<usize>) {
    let expected = expected_result(length, first.clone(), second.clone());
    let sentinel: Vec<u8> = (0..length).map(|index| 0xa0 + index as u8).collect();
    let mut data = sentinel.clone();
    match expected {
        Err(error) => {
            assert_eq!(select_regions(&mut data, first, second), Err(error));
            assert_eq!(data, sentinel, "error must preserve the whole buffer");
        }
        Ok(()) => {
            let first_len = first.end - first.start;
            let second_len = second.end - second.start;
            let before = data.clone();
            let first_pointer = if first_len > 0 {
                Some(data.as_ptr().wrapping_add(first.start))
            } else { None };
            let second_pointer = if second_len > 0 {
                Some(data.as_ptr().wrapping_add(second.start))
            } else { None };
            let (first_view, second_view) =
                select_regions(&mut data, first.clone(), second.clone()).unwrap();
            assert_eq!(first_view.len(), first_len);
            assert_eq!(second_view.len(), second_len);
            assert_eq!(first_view, &before[first.start..first.end]);
            assert_eq!(second_view, &before[second.start..second.end]);
            if first_len > 0 { assert_eq!(first_view.as_ptr(), first_pointer.unwrap()); }
            if second_len > 0 { assert_eq!(second_view.as_ptr(), second_pointer.unwrap()); }
            for (offset, byte) in first_view.iter_mut().enumerate() {
                *byte = 0x10 + offset as u8;
            }
            for (offset, byte) in second_view.iter_mut().enumerate() {
                *byte = 0x80 + offset as u8;
            }
            drop((first_view, second_view));
            for index in 0..length {
                let expected_byte = if first.start <= index && index < first.end {
                    0x10 + (index - first.start) as u8
                } else if second.start <= index && index < second.end {
                    0x80 + (index - second.start) as u8
                } else { sentinel[index] };
                assert_eq!(data[index], expected_byte, "mutation at index {index}");
            }
        }
    }
}

#[test]
fn exhaustive_endpoint_matrix_2274() {
    let mut cases = 0usize;
    for length in 0..=4 {
        for first_start in 0..=length + 1 {
            for first_end in 0..=length + 1 {
                for second_start in 0..=length + 1 {
                    for second_end in 0..=length + 1 {
                        cases += 1;
                        check_case(length, first_start..first_end, second_start..second_end);
                    }
                }
            }
        }
    }
    assert_eq!(cases, 2274);
}

#[test]
fn empty_ranges_are_valid_at_boundaries_and_interior() {
    let mut data = [1_u8, 2, 3, 4];
    let result = select_regions(&mut data, 2..2, 0..4);
    assert!(result.is_ok(), "an interior empty range must be accepted");
    let (a, b) = result.unwrap();
    assert!(a.is_empty());
    assert_eq!(b, &[1, 2, 3, 4]);
    drop((a, b));
    let (a, b) = select_regions(&mut data, 0..0, 4..4).unwrap();
    assert!(a.is_empty() && b.is_empty());
}

#[test]
fn valid_regions_preserve_lengths_identity_order_and_mutation_visibility() {
    let mut data = [10_u8, 20, 30, 40, 50, 60];
    let base = data.as_ptr();
    let (first, second) = select_regions(&mut data, 4..6, 1..3).unwrap();
    assert_eq!(first.as_ptr(), base.wrapping_add(4));
    assert_eq!(second.as_ptr(), base.wrapping_add(1));
    assert_eq!((first.len(), second.len()), (2, 2));
    first[0] = 61;
    second[1] = 22;
    drop((first, second));
    assert_eq!(data, [10, 20, 22, 40, 61, 60]);
    let base = data.as_ptr();
    let (first, second) = select_regions(&mut data, 0..2, 3..5).unwrap();
    assert_eq!(first.as_ptr(), base);
    assert_eq!(second.as_ptr(), base.wrapping_add(3));
    first[1] = 21;
    second[0] = 41;
    drop((first, second));
    assert_eq!(data, [10, 21, 22, 41, 61, 60]);
}

#[test]
fn adjacent_gapped_and_full_ranges_are_valid() {
    let mut data = [0_u8; 8];
    assert!(select_regions(&mut data, 0..2, 2..4).is_ok());
    assert!(select_regions(&mut data, 4..5, 6..8).is_ok());
    assert_eq!(select_regions(&mut data, 0..8, 8..8).unwrap().0.len(), 8);
}

fn assert_error_preserves(
    mut data: [u8; 4],
    first: std::ops::Range<usize>,
    second: std::ops::Range<usize>,
    expected: RangeError,
) {
    let before = data;
    assert_eq!(select_regions(&mut data, first, second), Err(expected));
    assert_eq!(data, before);
}

#[test]
fn errors_have_ordered_precedence_and_never_mutate() {
    assert_error_preserves([7, 8, 9, 10], 4..3, 0..9, RangeError::FirstInvalid);
    assert_error_preserves([7, 8, 9, 10], 0..4, 4..3, RangeError::SecondInvalid);
    assert_error_preserves([7, 8, 9, 10], 0..4, 2..9, RangeError::SecondInvalid);
    assert_error_preserves([7, 8, 9, 10], 0..3, 2..4, RangeError::Overlap);
    assert_error_preserves([7, 8, 9, 10], 1..4, 0..2, RangeError::Overlap);
    assert_error_preserves([7, 8, 9, 10], 1..3, 0..4, RangeError::Overlap);
}

#[test]
fn repeated_calls_support_arbitrary_bytes_and_temporary_views() {
    let mut data = [0, 255, 17, 128, 42, 99];
    for _ in 0..8 {
        let (first, second) = select_regions(&mut data, 1..2, 4..6).unwrap();
        assert_eq!(first, &[255]);
        assert_eq!(second, &[42, 99]);
        drop((first, second));
        data[2] = data[2].wrapping_add(1);
    }
    assert_eq!(data, [0, 255, 25, 128, 42, 99]);
}

#[test]
fn extreme_usize_max_endpoints_are_rejected_without_overflow() {
    let mut data = [4_u8, 5, 6];
    assert_eq!(select_regions(&mut data, usize::MAX..usize::MAX, 0..0), Err(RangeError::FirstInvalid));
    assert_eq!(select_regions(&mut data, 0..0, usize::MAX..usize::MAX), Err(RangeError::SecondInvalid));
    assert_eq!(select_regions(&mut data, usize::MAX..0, 0..0), Err(RangeError::FirstInvalid));
    assert_eq!(select_regions(&mut data, 0..0, usize::MAX..0), Err(RangeError::SecondInvalid));
    assert_eq!(data, [4, 5, 6]);
}
`;

const primaryPrompt = String.raw`Zaimplementuj dokładnie:

use std::ops::Range;
#[derive(Debug, PartialEq, Eq)]
pub enum RangeError { FirstInvalid, SecondInvalid, Overlap }
pub fn select_regions<'a>(buffer: &'a mut [u8], first: Range<usize>, second: Range<usize>)
    -> Result<(&'a mut [u8], &'a mut [u8]), RangeError>;

Zakresy są półotwarte: start należy do zakresu, a end już nie. Zakres jest
niepoprawny, gdy start > end albo end > buffer.len(). Najpierw zgłoś
FirstInvalid, potem SecondInvalid, a Overlap dopiero po poprawności obu zakresów.
Overlap oznacza dwa niepuste zakresy spełniające first.start < second.end i
second.start < first.end. Zachowaj kolejność argumentów. Pusty zakres nie
zawiera żadnego elementu i nie
nachodzi na żaden zakres; 2..2 z 0..4 jest poprawne, a dwa puste zakresy też.

Na błędzie nie zmieniaj bufora. Po sukcesie każdy niepusty slice musi wskazywać
dokładnie oryginalne elementy i mieć dokładną długość; kolejność krotki zawsze
odpowiada kolejności argumentów, nawet gdy second jest wcześniejszy. Mutacje
wyników muszą być widoczne w buforze po ich zwolnieniu, a luka i reszta bufora
mają pozostać nietknięte. Zakresy sąsiadujące i rozdzielone luką są poprawne,
zakresy zagnieżdżone i krzyżujące się są błędem. To zadanie nie wymaga unsafe,
konkretnego zapisu źródłowego ani konkretnej strategii alokacji; testuje wyłącznie
opisane zachowanie. Tożsamość wskaźnika pustych wyników jest dowolna, ale ich
długość musi wynosić zero.`;

export const disjointRangesSteps: LessonStep[] = [
  {
    id: "disjoint-regions-range-model",
    kind: "run",
    title: "Model: dwa zakresy i kolejność argumentów",
    prompt:
      "Uruchom model dla ustalonych zakresów `0..2` i `2..4`; zwróć uwagę na półotwarty koniec, pusty zakres oraz błąd overlap.",
    code: disjointRangesModel,
    solution: disjointRangesModel,
    evaluator: { kind: "exact-output", expected: modelRunExpected },
    expectedStatus: "success",
    evidenceKind: "exposure",
    evidenceGate: false,
  },
  {
    id: disjointRangesPrimaryStepId,
    kind: "apply",
    title: "Przenieś dowód na dwa zakresy",
    prompt: primaryPrompt,
    code: disjointRangesStarter,
    solution: disjointRangesSolution,
    hints: [
      "Najpierw sprawdź oba zakresy i dopiero potem rozstrzygnij overlap; pusty zakres nie zajmuje elementu.",
      "Posortuj niepuste zakresy tylko na czas dzielenia slice'a, a wynik zwróć w kolejności argumentów.",
    ],
    evaluator: { kind: "tests", tests: disjointRangesTests },
    evidenceKind: "transfer",
    evidenceGate: true,
    evidence: {
      version: 2,
      conceptIds: ["unsafe-miri-disjoint-regions-contract"],
      codingTaskId: disjointRangesFamily,
    },
  },
];
