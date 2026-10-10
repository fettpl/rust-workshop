/** Representation alternatives and compiling counterexamples are trusted authored verification data only. */
export const baselinePrimitiveFixtures = [
  {
    lessonId: "bindings-types",
    stepId: "numeric-halves-transfer",
    alternate:
      "fn complete_pairs(items: u32) -> u32 { (items - items % 2) / 2 } fn main() {}",
    mutants: {
      roundsUp:
        "fn complete_pairs(items: u32) -> u32 { (items + 1) / 2 } fn main() {}",
      displayedInputOnly: "fn complete_pairs(_: u32) -> u32 { 3 } fn main() {}",
    },
  },
  {
    lessonId: "functions-expressions",
    stepId: "function-tuple-repair",
    alternate:
      "fn split_minutes(minutes: u32) -> (u32, u32) { let hours = minutes / 60; (hours, minutes - hours * 60) } fn main() {}",
    mutants: {
      reversedPositions:
        "fn split_minutes(minutes: u32) -> (u32, u32) { (minutes % 60, minutes / 60) } fn main() {}",
      losesRemainder:
        "fn split_minutes(minutes: u32) -> (u32, u32) { (minutes / 60, 0) } fn main() {}",
    },
  },
  {
    lessonId: "control-flow",
    stepId: "flow-range-transfer",
    alternate: `fn count_even_above(start: u32, end: u32, minimum: u32) -> u32 {
    let mut number = start;
    let mut count = 0;
    while number < end {
        if number % 2 == 0 {
            if minimum <= number { count += 1; }
        }
        number += 1;
    }
    count
}
fn main() {}`,
    mutants: {
      includesEnd: `fn count_even_above(start: u32, end: u32, minimum: u32) -> u32 {
    let mut count = 0;
    for number in start..=end {
        if number >= minimum && number % 2 == 0 { count += 1; }
    }
    count
}
fn main() {}`,
      ignoresMinimum: `fn count_even_above(start: u32, end: u32, _minimum: u32) -> u32 {
    let mut count = 0;
    for number in start..end { if number % 2 == 0 { count += 1; } }
    count
}
fn main() {}`,
      oddInsteadOfEven: `fn count_even_above(start: u32, end: u32, minimum: u32) -> u32 {
    let mut count = 0;
    for number in start..end { if number >= minimum && number % 2 == 1 { count += 1; } }
    count
}
fn main() {}`,
    },
  },
  {
    lessonId: "move-copy-discovery",
    stepId: "move-owned-transform",
    alternate: `fn uppercase_owned(text: String) -> String {
    text.chars().flat_map(char::to_uppercase).collect()
}
fn main() {}`,
    mutants: {
      asciiOnly:
        "fn uppercase_owned(text: String) -> String { text.to_ascii_uppercase() } fn main() {}",
      returnsOriginal:
        "fn uppercase_owned(text: String) -> String { text } fn main() {}",
      trimsWhitespace:
        "fn uppercase_owned(text: String) -> String { text.trim().to_uppercase() } fn main() {}",
    },
  },
];
