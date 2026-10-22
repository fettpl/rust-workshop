import type { LessonStep } from "@/domain/types";

export const disjointRangesPrimaryStepId =
  "disjoint-regions-range-transfer" as const;
export const disjointRangesFamily = "unsafe-miri/disjoint-ranges-v1" as const;

export const disjointRangesModel = String.raw`use std::ops::Range;

fn show_fixed_ranges(first: Range<usize>, second: Range<usize>) {
    println!("pierwszy: {:?}, drugi: {:?}", first, second);
}

fn main() {
    let mut buffer = [10_u8, 20, 30, 40];
    let (first, second) = buffer.split_at_mut(2);
    first[0] = 11;
    println!("{:?} {:?}", first, second);
    show_fixed_ranges(0..2, 2..4);
    println!("puste 2..2 nie nachodzi na 0..4");
    println!("nakładanie 0..3 i 2..4: Overlap");
}`;

const modelRunExpected =
  "[11, 20] [30, 40]\npierwszy: 0..2, drugi: 2..4\npuste 2..2 nie nachodzi na 0..4\nnakładanie 0..3 i 2..4: Overlap\n";

export const disjointRangesSolution = String.raw`use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
enum RangeError {
    FirstInvalid,
    SecondInvalid,
    Overlap,
}

fn valid_range(range: &Range<usize>, length: usize) -> bool {
    range.start <= range.end && range.end <= length
}

fn select_regions<'a>(
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

export const disjointRangesEquivalent = String.raw`use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
enum RangeError {
    FirstInvalid,
    SecondInvalid,
    Overlap,
}

fn select_regions<'a>(
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
    let (low, high) = if first_is_low {
        (first, second)
    } else {
        (second, first)
    };
    let (_, tail) = buffer.split_at_mut(low.start);
    let (low_slice, after_low) = tail.split_at_mut(low.end - low.start);
    let (_, tail) = after_low.split_at_mut(high.start - low.end);
    let (high_slice, _) = tail.split_at_mut(high.end - high.start);
    if first_is_low {
        Ok((low_slice, high_slice))
    } else {
        Ok((high_slice, low_slice))
    }
}
`;

export const disjointRangesStarter = String.raw`use std::ops::Range;

#[derive(Debug, PartialEq, Eq)]
enum RangeError {
    FirstInvalid,
    SecondInvalid,
    Overlap,
}

fn select_regions<'a>(
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
  offByOneBounds: offByOneBoundsMutant,
  malformedRangeAcceptance: malformedRangeMutant,
  mutateBeforeError: mutateBeforeErrorMutant,
  incorrectLength: wrongLengthMutant,
} as const;

export const disjointRangesTests = String.raw`#[test]
fn empty_ranges_are_valid_at_boundaries_and_interior() {
    let mut data = [1_u8, 2, 3, 4];
    let (a, b) = select_regions(&mut data, 2..2, 0..4).unwrap();
    assert!(a.is_empty());
    assert_eq!(b, &[1, 2, 3, 4]);
    drop((a, b));
    let (a, b) = select_regions(&mut data, 0..0, 4..4).unwrap();
    assert!(a.is_empty());
    assert!(b.is_empty());
}

#[test]
fn valid_regions_preserve_lengths_identity_order_and_mutation_visibility() {
    let mut data = [10_u8, 20, 30, 40, 50, 60];
    let base = data.as_mut_ptr();
    let (first, second) = select_regions(&mut data, 4..6, 1..3).unwrap();
    assert_eq!(first.as_ptr(), unsafe { base.add(4) });
    assert_eq!(second.as_ptr(), unsafe { base.add(1) });
    assert_eq!(first.len(), 2);
    assert_eq!(second.len(), 2);
    first[0] = 61;
    second[1] = 22;
    drop((first, second));
    assert_eq!(data, [10, 20, 22, 40, 61, 60]);

    let base = data.as_mut_ptr();
    let (first, second) = select_regions(&mut data, 0..2, 3..5).unwrap();
    assert_eq!(first.as_ptr(), base);
    assert_eq!(second.as_ptr(), unsafe { base.add(3) });
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

fn assert_error_preserves(mut data: [u8; 4], first: std::ops::Range<usize>, second: std::ops::Range<usize>, expected: RangeError) {
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
    assert_eq!(data[0], 0);
    assert_eq!(data[3], 128);
}
`;

const primaryPrompt = String.raw`Zaimplementuj dokładnie:

use std::ops::Range;
#[derive(Debug, PartialEq, Eq)]
enum RangeError { FirstInvalid, SecondInvalid, Overlap }
fn select_regions<'a>(buffer: &'a mut [u8], first: Range<usize>, second: Range<usize>)
    -> Result<(&'a mut [u8], &'a mut [u8]), RangeError>;

Zakresy są półotwarte: start należy do zakresu, a end już nie. Zakres jest
niepoprawny, gdy start > end albo end > buffer.len(). Najpierw zgłoś
FirstInvalid, potem SecondInvalid, a Overlap dopiero po poprawności obu zakresów.
Overlap oznacza dwa niepuste zakresy spełniające first.start < second.end i
    second.start < first.end. Zachowaj kolejność wywołania (caller order), czyli
    kolejność argumentów.
Pusty zakres, także wewnątrz drugiego, nie nachodzi na
żaden zakres; 2..2 z 0..4 jest poprawne, a dwa puste zakresy też są poprawne.

Na błędzie nie zmieniaj bufora. Po sukcesie każdy niepusty slice musi wskazywać
dokładnie oryginalne elementy i mieć dokładną długość; kolejność krotki zawsze
odpowiada kolejności argumentów, nawet gdy second jest wcześniejszy. Mutacje
wyników muszą być widoczne w buforze po ich zwolnieniu, a luka i reszta bufora
mają pozostać nietknięte. Zakresy sąsiadujące i rozdzielone luką są poprawne,
zakresy zagnieżdżone i krzyżujące się są błędem. To zadanie nie wymaga unsafe,
konkretnego zapisu źródłowego ani konkretnej strategii alokacji; to testuje
wyłącznie opisane zachowanie. Tożsamość wskaźnika pustych wyników jest dowolna,
ale ich długość musi wynosić zero.`;

export const disjointRangesSteps: LessonStep[] = [
  {
    id: "disjoint-regions-range-model",
    kind: "run",
    title: "Model: dwa zakresy i kolejność caller'a",
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

