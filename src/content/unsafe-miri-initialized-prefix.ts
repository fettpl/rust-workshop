import type { LessonStep } from "@/domain/types";

export const initializedPrefixLessonId = "unsafe-miri-byte-view";
export const initializedPrefixModelStepId =
  "byte-view-initialized-prefix-model";
export const initializedPrefixPrimaryStepId = "byte-view-initialized-prefix";
export const initializedPrefixFamily = "unsafe-miri/initialized-prefix-v1";
export const initializedPrefixConceptId = "unsafe-miri-byte-view-contract";

/** A fixed, runnable bridge from MaybeUninit storage to an initialized view. */
export const initializedPrefixModel = String.raw`use std::mem::MaybeUninit;

fn main() {
    let mut storage = [MaybeUninit::<u8>::uninit(); 3];
    storage[0].write(0);
    storage[1].write(255);
    // SAFETY: both elements were initialized above and the slice stays in storage.
    let initialized = unsafe {
        std::slice::from_raw_parts(storage.as_ptr().cast::<u8>(), 2)
    };
    println!("{:?}", initialized);
}`;

/** Safe starter: the learner must replace this deliberate, compilable stub. */
export const initializedPrefixStarter = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong> {
    let _ = (dst, src);
    Err(TooLong)
}`;

/** Positive element-write solution. The bounds check precedes every write. */
export const initializedPrefixSolution = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong> {
    if src.len() > dst.len() {
        return Err(TooLong);
    }
    for (slot, byte) in dst.iter_mut().zip(src.iter().copied()) {
        slot.write(byte);
    }
    // SAFETY: the checked prefix was initialized one element at a time. u8
    // has no invalid bit patterns or Drop glue, and the borrow is tied to dst.
    unsafe {
        Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len()))
    }
}`;

/** Positive checked bulk-copy solution, kept as a maintained equivalent. */
export const initializedPrefixEquivalent = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong> {
    if src.len() > dst.len() {
        return Err(TooLong);
    }
    // SAFETY: the checked lengths keep the destination range in bounds;
    // safe borrows keep the source and destination disjoint.
    unsafe {
        std::ptr::copy_nonoverlapping(
            src.as_ptr(),
            dst.as_mut_ptr().cast::<u8>(),
            src.len(),
        );
        // SAFETY: every returned byte was initialized by the copy above.
        Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len()))
    }
}`;

/** Reviewed safe semantic mutant: it rejects a valid non-empty exact capacity. */
export const initializedPrefixMutant = String.raw`use std::mem::MaybeUninit;

#[derive(Debug, PartialEq, Eq)]
pub struct TooLong;

pub fn fill_prefix<'dst>(
    dst: &'dst mut [MaybeUninit<u8>],
    src: &[u8],
) -> Result<&'dst [u8], TooLong> {
    if src.len() > dst.len() || (!src.is_empty() && src.len() == dst.len()) {
        return Err(TooLong);
    }
    for (slot, byte) in dst.iter_mut().zip(src.iter().copied()) {
        slot.write(byte);
    }
    // SAFETY: this exposes only the prefix initialized above.
    unsafe {
        Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len()))
    }
}`;

/** The complete shared42 harness; it is consumed by lesson and native proofs. */
export const initializedPrefixTests = String.raw`use std::mem::MaybeUninit;

fn fresh<const N: usize>() -> [MaybeUninit<u8>; N] {
    [MaybeUninit::uninit(); N]
}

#[test]
fn case01_empty_destination_and_source() {
    let mut dst = fresh::<0>();
    let out = crate::fill_prefix(&mut dst, &[]).unwrap();
    assert!(out.is_empty(), "empty result must be empty");
}
#[test]
fn case02_empty_source_fresh_destination() {
    let mut dst = fresh::<4>();
    assert!(crate::fill_prefix(&mut dst, &[]).unwrap().is_empty());
}
#[test]
fn case03_empty_source_initialized_sentinel_no_write() {
    let mut dst = [MaybeUninit::new(0x5a); 4];
    assert!(crate::fill_prefix(&mut dst, &[]).unwrap().is_empty());
    let observed = unsafe {
        [
            dst[0].assume_init(),
            dst[1].assume_init(),
            dst[2].assume_init(),
            dst[3].assume_init(),
        ]
    };
    assert_eq!(observed, [0x5a; 4], "empty source must not write");
}
#[test]
fn case04_one_byte_zero() {
    let mut dst = fresh::<1>();
    assert_eq!(crate::fill_prefix(&mut dst, &[0]).unwrap(), &[0]);
}
#[test]
fn case05_one_byte_high() {
    let mut dst = fresh::<1>();
    assert_eq!(crate::fill_prefix(&mut dst, &[255]).unwrap(), &[255]);
}
#[test]
fn case06_partial_array_prefix() {
    let mut dst = fresh::<6>();
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]).unwrap(), &[1, 2, 3]);
}
#[test]
fn case07_partial_vec_prefix() {
    let mut dst = vec![MaybeUninit::uninit(); 6];
    assert_eq!(crate::fill_prefix(&mut dst, &[4, 5, 6]).unwrap(), &[4, 5, 6]);
}
#[test]
fn case08_exact_capacity() {
    let mut dst = fresh::<3>();
    assert_eq!(crate::fill_prefix(&mut dst, &[b'R', 0, 255]).unwrap(), &[b'R', 0, 255], "exact capacity must succeed");
}
#[test]
fn case09_oversized_source_returns_error() {
    let mut dst = [MaybeUninit::new(0x5a); 3];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3, 4]), Err(crate::TooLong));
}
#[test]
fn case10_oversized_source_does_not_write() {
    let mut dst = [MaybeUninit::new(0x5a); 4];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3, 4, 5]), Err(crate::TooLong), "oversized source must fail before writes");
    let observed = unsafe {
        [dst[0].assume_init(), dst[1].assume_init(), dst[2].assume_init(), dst[3].assume_init()]
    };
    assert_eq!(observed, [0x5a; 4], "TooLong must preserve every sentinel");
}
#[test]
fn case11_arbitrary_zero_high_bytes() {
    let mut dst = fresh::<4>();
    let source = [0, 255, 1, 254];
    assert_eq!(crate::fill_prefix(&mut dst, &source).unwrap(), &source);
}
#[test]
fn case12_invalid_utf8_bytes() {
    let mut dst = fresh::<3>();
    let source = [0xff, 0xfe, 0x80];
    assert_eq!(crate::fill_prefix(&mut dst, &source).unwrap(), &source);
}
#[test]
fn case13_nonempty_pointer_identity_array() {
    let mut dst = fresh::<4>();
    let start = dst.as_mut_ptr().cast::<u8>();
    let out = crate::fill_prefix(&mut dst, &[7, 8]).unwrap();
    assert_eq!(out.as_ptr(), start, "nonempty output must begin at destination");
}
#[test]
fn case14_nonempty_pointer_identity_vec() {
    let mut dst = vec![MaybeUninit::uninit(); 4];
    let start = dst.as_mut_ptr().cast::<u8>();
    let out = crate::fill_prefix(&mut dst, &[7, 8]).unwrap();
    assert_eq!(out.as_ptr(), start, "Vec output must begin at destination");
}
#[test]
fn case15_output_length_one() {
    let mut dst = fresh::<4>();
    assert_eq!(crate::fill_prefix(&mut dst, &[9]).unwrap().len(), 1);
}
#[test]
fn case16_output_length_partial() {
    let mut dst = fresh::<5>();
    assert_eq!(crate::fill_prefix(&mut dst, &[9, 8]).unwrap().len(), 2);
}
#[test]
fn case17_empty_result_has_no_identity_requirement() {
    let mut dst = fresh::<4>();
    assert_eq!(crate::fill_prefix(&mut dst, &[]).unwrap().len(), 0);
}
#[test]
fn case18_source_lifetime_independence() {
    let mut dst = fresh::<4>();
    let out = {
        let source = vec![0, 255, 128];
        crate::fill_prefix(&mut dst, &source).unwrap()
    };
    assert_eq!(out, &[0, 255, 128], "output must not retain source lifetime");
}
#[test]
fn case19_destination_reusable_after_last_borrow() {
    let mut dst = [MaybeUninit::new(0x11); 2];
    {
        assert_eq!(crate::fill_prefix(&mut dst, &[7, 8]).unwrap(), &[7, 8]);
    }
    dst[0].write(9);
    assert_eq!(unsafe { dst[0].assume_init() }, 9);
}
#[test]
fn case20_array_capacity_one() {
    let mut dst = fresh::<1>();
    assert_eq!(crate::fill_prefix(&mut dst, &[42]).unwrap(), &[42]);
}
#[test]
fn case21_vec_capacity_one() {
    let mut dst = vec![MaybeUninit::uninit(); 1];
    assert_eq!(crate::fill_prefix(&mut dst, &[42]).unwrap(), &[42]);
}
#[test]
fn case22_destination_longer_than_source() {
    let mut dst = fresh::<9>();
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3, 4]).unwrap().len(), 4);
}
#[test]
fn case23_nonempty_destination_empty_source() {
    let mut dst = [MaybeUninit::new(0x33); 9];
    assert!(crate::fill_prefix(&mut dst, &[]).unwrap().is_empty());
}
#[test]
fn case24_empty_destination_oversized_source() {
    let mut dst = fresh::<0>();
    assert_eq!(crate::fill_prefix(&mut dst, &[1]), Err(crate::TooLong));
}
#[test]
fn case25_prefix_order() {
    let mut dst = fresh::<5>();
    assert_eq!(crate::fill_prefix(&mut dst, &[3, 1, 4, 1]).unwrap(), &[3, 1, 4, 1]);
}
#[test]
fn case26_prefix_exact_values() {
    let mut dst = fresh::<4>();
    let out = crate::fill_prefix(&mut dst, &[10, 20, 30]).unwrap();
    assert_eq!((out[0], out[1], out[2]), (10, 20, 30));
}
#[test]
fn case27_initialized_suffix_preserved() {
    let mut dst = [MaybeUninit::new(0x5a); 6];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]).unwrap(), &[1, 2, 3]);
    let suffix = unsafe { [dst[3].assume_init(), dst[4].assume_init(), dst[5].assume_init()] };
    assert_eq!(suffix, [0x5a; 3], "initialized suffix must be unchanged");
}
#[test]
fn case28_too_long_preserves_first_sentinel() {
    let mut dst = [MaybeUninit::new(0x5a); 2];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]), Err(crate::TooLong));
    assert_eq!(unsafe { dst[0].assume_init() }, 0x5a);
}
#[test]
fn case29_too_long_preserves_last_sentinel() {
    let mut dst = [MaybeUninit::new(0x5a); 2];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]), Err(crate::TooLong));
    assert_eq!(unsafe { dst[1].assume_init() }, 0x5a);
}
#[test]
fn case30_repeated_calls() {
    let mut dst = [MaybeUninit::new(0x5a); 4];
    assert_eq!(crate::fill_prefix(&mut dst, &[1]).unwrap(), &[1]);
    assert_eq!(crate::fill_prefix(&mut dst, &[2, 3, 4]).unwrap(), &[2, 3, 4]);
}
#[test]
fn case31_two_independent_backings() {
    let mut left = fresh::<3>();
    let mut right = vec![MaybeUninit::uninit(); 3];
    assert_eq!(crate::fill_prefix(&mut left, &[1, 2]).unwrap(), &[1, 2]);
    assert_eq!(crate::fill_prefix(&mut right, &[3, 4]).unwrap(), &[3, 4]);
}
#[test]
fn case32_high_byte_255_survives() {
    let mut dst = fresh::<2>();
    assert_eq!(crate::fill_prefix(&mut dst, &[254, 255]).unwrap(), &[254, 255]);
}
#[test]
fn case33_zero_byte_in_middle_survives() {
    let mut dst = fresh::<3>();
    assert_eq!(crate::fill_prefix(&mut dst, &[9, 0, 8]).unwrap(), &[9, 0, 8]);
}
#[test]
fn case34_output_is_destination_slice() {
    let mut dst = fresh::<4>();
    let destination = dst.as_mut_ptr() as usize;
    let out = crate::fill_prefix(&mut dst, &[5, 6]).unwrap();
    assert_eq!(out.as_ptr() as usize, destination, "output must borrow destination");
}
#[test]
fn case35_initialized_prefix_only_is_read() {
    let mut dst = fresh::<5>();
    let out = crate::fill_prefix(&mut dst, &[11, 22]).unwrap();
    assert_eq!(out, &[11, 22], "only established prefix is readable");
}

#[test]
fn intended_reverse_order() {
    let mut dst = fresh::<4>();
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]).unwrap(), &[1, 2, 3], "reverse mutant must preserve source order");
}
#[test]
fn intended_wrong_prefix_value() {
    let mut dst = fresh::<4>();
    assert_eq!(crate::fill_prefix(&mut dst, &[7, 8]).unwrap(), &[7, 8], "prefix bytes must equal source");
}
#[test]
fn intended_returned_length() {
    let mut dst = fresh::<4>();
    assert_eq!(crate::fill_prefix(&mut dst, &[7, 8, 9]).unwrap().len(), 3, "returned length must equal source length");
}
#[test]
fn intended_exact_capacity() {
    let mut dst = fresh::<3>();
    let result = crate::fill_prefix(&mut dst, &[1, 2, 3]);
    assert!(result.is_ok(), "exact nonempty capacity must succeed");
    assert_eq!(result.unwrap(), &[1, 2, 3]);
}
#[test]
fn intended_oversized_no_write() {
    let mut dst = [MaybeUninit::new(0x5a); 2];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2, 3]), Err(crate::TooLong), "oversized source must fail before writes");
    assert_eq!(unsafe { [dst[0].assume_init(), dst[1].assume_init()] }, [0x5a; 2], "TooLong must not alter sentinel");
}
#[test]
fn intended_suffix_preservation() {
    let mut dst = [MaybeUninit::new(0x5a); 5];
    assert_eq!(crate::fill_prefix(&mut dst, &[1, 2]).unwrap(), &[1, 2]);
    assert_eq!(unsafe { [dst[2].assume_init(), dst[3].assume_init(), dst[4].assume_init()] }, [0x5a; 3], "mutant must not write beyond prefix");
}
#[test]
fn intended_destination_identity() {
    let mut dst = fresh::<3>();
    let start = dst.as_mut_ptr().cast::<u8>();
    let out = crate::fill_prefix(&mut dst, &[1, 2]).unwrap();
    assert_eq!(out.as_ptr(), start, "nonempty output must borrow destination rather than leak a copy");
}`;

const initializedPrefixStepHints: [string, string] = [
  "Najpierw zapisz niezmiennik: błąd nie wykonuje żadnego zapisu, a sukces publikuje dokładnie zainicjalizowany prefiks.",
  "Dopiero po sprawdzeniu długości użyj MaybeUninit::write albo sprawdzonego kopiowania. Zachowaj niezmieniony sufiks i nigdy go nie odczytuj; może pozostać niezainicjalniony. Wynik nie może być używany po zakończeniu życia dst ani równocześnie z kolejną mutacją dst; dla pustego źródła, pustego dst i przypadku, w którym oba są puste, sukces jest poprawny.",
];

function codingStep(
  id: string,
  kind: "apply" | "modify",
  title: string,
  prompt: string,
  code: string,
  solution: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    code,
    solution,
    hints: initializedPrefixStepHints,
    evaluator: { kind: "tests", tests: initializedPrefixTests },
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
  };
}

export const initializedPrefixSteps: readonly [LessonStep, LessonStep] = [
  {
    id: initializedPrefixModelStepId,
    kind: "run",
    title: "Od storage do zainicjalizowanego prefiksu",
    prompt:
      "Uruchom mały model z trzema komórkami storage: zapisz 0 i 255 przez MaybeUninit::write, a potem odczytaj wyłącznie dwa zainicjalizowane bajty. Sam adres MaybeUninit nie jest jeszcze czytelnym u8, write nie odczytuje starego storage, a model nie jest pełnym rozwiązaniem fill_prefix.",
    code: initializedPrefixModel,
    solution: initializedPrefixModel,
    evaluator: { kind: "exact-output", expected: "[0, 255]\n" },
    expectedStatus: "success",
    evidenceKind: "exposure",
  },
  codingStep(
    initializedPrefixPrimaryStepId,
    "apply",
    "Zainicjalizuj prefiks i pożycz wynik",
    "Zaimplementuj fill_prefix<'dst>(dst: &'dst mut [MaybeUninit<u8>], src: &[u8]) -> Result<&'dst [u8], TooLong>. Zwróć TooLong przed jakimkolwiek zapisem, gdy źródło jest dłuższe niż bufor. W pozostałych przypadkach skopiuj wszystkie bajty w kolejności do dokładnego prefiksu, także dla pojemności dokładnej, częściowej i pustego źródła; zachowaj niezmieniony sufiks i nigdy go nie odczytuj, bo może pozostać niezainicjalniony. Wynik niepusty ma wskazywać bufor docelowy; jego użycie nie może wykraczać poza życie dst, ale może skończyć się wcześniej, a dopóki wynik jest używany, nie wolno ponownie mutować dst przez konkurencyjne pożyczenie. Źródło może zniknąć po wywołaniu. Puste źródło, pusty bufor docelowy, także oba puste naraz, są poprawne. Dla pustego wyniku nie wymagamy tożsamości wskaźnika, lecz raw slice nadal wymaga poprawnej niezerowości i wyrównania, więc można zwrócić &[]. Każdy wzorzec bajtów, także nie-UTF-8, jest poprawnym u8, który nie ma Drop. Tymczasowa alokacja jest dozwolona, lecz wynik nie może wskazywać skopiowanej ani wyciekniętej pamięci.",
    initializedPrefixStarter,
    initializedPrefixSolution,
  ),
];

export type InitializedPrefixVariant = Readonly<{
  id: string;
  mechanism: "element" | "bulk";
  source: string;
  intendedAssertion: string;
  restoredSource: string;
  reviewedSafety: string;
}>;

const elementSolution = initializedPrefixSolution;
const bulkSolution = initializedPrefixEquivalent;

function replaceSource(
  source: string,
  needle: string,
  replacement: string,
  id: string,
) {
  if (!source.includes(needle)) {
    throw new Error(
      `initialized-prefix source replacement did not match: ${id}`,
    );
  }
  const replaced = source.replace(needle, replacement);
  if (replaced === source) {
    throw new Error(`initialized-prefix source replacement was a no-op: ${id}`);
  }
  return replaced;
}

const elementLeakedCopy = replaceSource(
  elementSolution,
  "unsafe {\n        Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len()))\n    }",
  "unsafe {\n        if src.is_empty() {\n            return Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), 0));\n        }\n        let leaked: &'static mut [u8] = Box::leak(src.to_vec().into_boxed_slice());\n        Ok(&*leaked)\n    }",
  "element-leaked-copy",
);
const bulkLeakedCopySetup = replaceSource(
  bulkSolution,
  "// SAFETY: the checked lengths keep the destination range in bounds;",
  "if src.is_empty() {\n        return Ok(&[]);\n    }\n    let leaked: &'static mut [u8] = Box::leak(src.to_vec().into_boxed_slice());\n    // SAFETY: the checked lengths keep the destination range in bounds;",
  "bulk-leaked-copy",
);
const bulkLeakedCopy = replaceSource(
  bulkLeakedCopySetup,
  "Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len()))",
  "Ok(&*leaked)",
  "bulk-leaked-copy-return",
);

/**
 * Maintainer source inventory. The fourteen entries are semantic controls for
 * the two maintained mechanisms; none is learner-facing code or a runner API.
 */
export const initializedPrefixSafeVariants: readonly InitializedPrefixVariant[] =
  [
    {
      id: "element-leaked-copy",
      mechanism: "element",
      source: elementLeakedCopy,
      intendedAssertion: "intended_destination_identity",
      restoredSource: elementSolution,
      reviewedSafety:
        "The destination prefix is initialized before the nonempty branch returns a live initialized leaked allocation; empty and TooLong paths remain safe, but destination identity is intentionally wrong.",
    },
    {
      id: "element-reject-exact",
      mechanism: "element",
      source: initializedPrefixMutant,
      intendedAssertion: "intended_exact_capacity",
      restoredSource: elementSolution,
      reviewedSafety:
        "The rejected call performs no unsafe read and the semantic error is in bounds.",
    },
    {
      id: "element-reverse",
      mechanism: "element",
      source: replaceSource(
        elementSolution,
        "for (slot, byte) in dst.iter_mut().zip(src.iter().copied()) {\n        slot.write(byte);\n    }",
        "for (index, (slot, _byte)) in dst.iter_mut().zip(src.iter().copied()).enumerate() {\n        slot.write(src[src.len() - 1 - index]);\n    }",
        "element-reverse",
      ),
      intendedAssertion: "intended_reverse_order",
      restoredSource: elementSolution,
      reviewedSafety:
        "Only initialized in-range bytes are written; the defect is order, not memory safety.",
    },
    {
      id: "element-shorter",
      mechanism: "element",
      source: replaceSource(
        elementSolution,
        "src.len()))",
        "src.len().saturating_sub(1)))",
        "element-shorter",
      ),
      intendedAssertion: "intended_returned_length",
      restoredSource: elementSolution,
      reviewedSafety: "The returned length is a bounded initialized subset.",
    },
    {
      id: "element-write-before-error",
      mechanism: "element",
      source: replaceSource(
        elementSolution,
        "return Err(TooLong);",
        "if !dst.is_empty() { dst[0].write(0xee); }\n        return Err(TooLong);",
        "element-write-before-error",
      ),
      intendedAssertion: "intended_oversized_no_write",
      restoredSource: elementSolution,
      reviewedSafety:
        "The extra write is in bounds and is checked as a semantic no-write violation.",
    },
    {
      id: "element-write-suffix",
      mechanism: "element",
      source: replaceSource(
        elementSolution,
        "// SAFETY: the checked prefix",
        "if !src.is_empty() && src.len() < dst.len() { dst[src.len()].write(0xee); }\n    // SAFETY: the checked prefix",
        "element-write-suffix",
      ),
      intendedAssertion: "intended_suffix_preservation",
      restoredSource: elementSolution,
      reviewedSafety:
        "The suffix write is in bounds and is caught by initialized sentinels.",
    },
    {
      id: "element-wrong-value",
      mechanism: "element",
      source: replaceSource(
        elementSolution,
        "slot.write(byte);",
        "slot.write(if byte == src[0] { byte ^ 1 } else { byte });",
        "element-wrong-value",
      ),
      intendedAssertion: "intended_wrong_prefix_value",
      restoredSource: elementSolution,
      reviewedSafety:
        "Every write remains a valid u8 write inside the established prefix.",
    },
    {
      id: "bulk-leaked-copy",
      mechanism: "bulk",
      source: bulkLeakedCopy,
      intendedAssertion: "intended_destination_identity",
      restoredSource: bulkSolution,
      reviewedSafety:
        "The destination prefix is initialized by the bulk copy before the nonempty branch returns a live initialized leaked allocation; empty and TooLong paths remain safe, but destination identity is intentionally wrong.",
    },
    {
      id: "bulk-reject-exact",
      mechanism: "bulk",
      source: replaceSource(
        initializedPrefixMutant,
        "for (slot, byte) in dst.iter_mut().zip(src.iter().copied()) {\n        slot.write(byte);\n    }",
        "unsafe { std::ptr::copy_nonoverlapping(src.as_ptr(), dst.as_mut_ptr().cast::<u8>(), src.len()); }",
        "bulk-reject-exact",
      ),
      intendedAssertion: "intended_exact_capacity",
      restoredSource: bulkSolution,
      reviewedSafety:
        "The rejected exact case occurs before copying and does not expose uninitialized data.",
    },
    {
      id: "bulk-reverse",
      mechanism: "bulk",
      source: replaceSource(
        bulkSolution,
        "// SAFETY: every returned byte",
        "for i in 0..(src.len() / 2) { dst[..src.len()].swap(i, src.len() - 1 - i); }\n        // SAFETY: every returned byte",
        "bulk-reverse",
      ),
      intendedAssertion: "intended_reverse_order",
      restoredSource: bulkSolution,
      reviewedSafety: "Swaps happen only among initialized prefix elements.",
    },
    {
      id: "bulk-shorter",
      mechanism: "bulk",
      source: replaceSource(
        bulkSolution,
        "src.len()))",
        "src.len().saturating_sub(1)))",
        "bulk-shorter",
      ),
      intendedAssertion: "intended_returned_length",
      restoredSource: bulkSolution,
      reviewedSafety: "The shorter slice is still within initialized storage.",
    },
    {
      id: "bulk-write-before-error",
      mechanism: "bulk",
      source: replaceSource(
        bulkSolution,
        "return Err(TooLong);",
        "if !dst.is_empty() { dst[0].write(0xee); }\n        return Err(TooLong);",
        "bulk-write-before-error",
      ),
      intendedAssertion: "intended_oversized_no_write",
      restoredSource: bulkSolution,
      reviewedSafety:
        "The deliberate in-bounds write is observable through the sentinel control.",
    },
    {
      id: "bulk-write-suffix",
      mechanism: "bulk",
      source: replaceSource(
        bulkSolution,
        "// SAFETY: the checked lengths",
        "if !src.is_empty() && src.len() < dst.len() { dst[src.len()].write(0xee); }\n    // SAFETY: the checked lengths",
        "bulk-write-suffix",
      ),
      intendedAssertion: "intended_suffix_preservation",
      restoredSource: bulkSolution,
      reviewedSafety:
        "The extra suffix write is in bounds and is caught without reading uninitialized storage.",
    },
    {
      id: "bulk-wrong-value",
      mechanism: "bulk",
      source: replaceSource(
        bulkSolution,
        "// SAFETY: every returned byte",
        "if !src.is_empty() { dst[0].write(src[0] ^ 1); }\n        // SAFETY: every returned byte",
        "bulk-wrong-value",
      ),
      intendedAssertion: "intended_wrong_prefix_value",
      restoredSource: bulkSolution,
      reviewedSafety:
        "The replacement is a valid initialized u8 value in the prefix.",
    },
  ];

if (initializedPrefixSafeVariants.length !== 14) {
  throw new Error(
    "initialized-prefix variant inventory must contain fourteen entries",
  );
}
for (const variant of initializedPrefixSafeVariants) {
  if (variant.source === variant.restoredSource) {
    throw new Error(
      `initialized-prefix variant is not semantic: ${variant.id}`,
    );
  }
  const helperCount =
    initializedPrefixTests.split(`fn ${variant.intendedAssertion}(`).length - 1;
  if (helperCount !== 1) {
    throw new Error(
      `initialized-prefix intended helper must occur exactly once: ${variant.id}`,
    );
  }
  const mechanismMarker =
    variant.mechanism === "element" ? "slot.write" : "copy_nonoverlapping";
  if (!variant.source.includes(mechanismMarker)) {
    throw new Error(`initialized-prefix mechanism mismatch: ${variant.id}`);
  }
}
