/** Reviewed Rust 1.85-compatible public APIs; each starter intentionally fails its callers. */
export const completePairsContract = {
  starter: `fn complete_pairs(items: u32) -> u32 {
    0
}
fn main() {
    println!("{}", complete_pairs(7));
}`,
  solution: `fn complete_pairs(items: u32) -> u32 {
    items / 2
}
fn main() {
    println!("{}", complete_pairs(7));
}`,
  tests: `#[test]
fn counts_only_complete_pairs_in_the_published_range() {
    let pairs: fn(u32) -> u32 = complete_pairs;
    for (items, expected) in [(0, 0), (1, 0), (2, 1), (7, 3), (8, 4), (999, 499), (1000, 500)] {
        assert_eq!(pairs(items), expected);
    }
}`,
};

export const splitMinutesContract = {
  starter: `fn split_minutes(minutes: u32) -> (u32, u32) {
    (minutes / 60, minutes % 60);
}
fn main() {
    let (hours, rest) = split_minutes(125);
    println!("{hours} {rest}");
}`,
  solution: `fn split_minutes(minutes: u32) -> (u32, u32) {
    let hours = minutes / 60;
    let rest = minutes % 60;
    return (hours, rest);
}
fn main() {
    let (hours, rest) = split_minutes(125);
    println!("{hours} {rest}");
}`,
  tests: `#[test]
fn splits_hours_and_remainder_without_changing_the_order() {
    let split: fn(u32) -> (u32, u32) = split_minutes;
    for (input, expected) in [(0, (0, 0)), (1, (0, 1)), (59, (0, 59)), (60, (1, 0)), (61, (1, 1)), (125, (2, 5)), (1440, (24, 0))] {
        let (hours, rest) = split(input);
        assert_eq!((hours, rest), expected);
    }
}`,
};

export const rangeSelectionContract = {
  starter: `fn count_even_above(start: u32, end: u32, minimum: u32) -> u32 {
    0
}
fn main() {
    println!("{}", count_even_above(1, 9, 4));
}`,
  solution: `fn count_even_above(start: u32, end: u32, minimum: u32) -> u32 {
    let mut count = 0;
    for number in start..end {
        if number >= minimum && number % 2 == 0 {
            count = count + 1;
        }
    }
    count
}
fn main() {
    println!("{}", count_even_above(1, 9, 4));
}`,
  tests: `#[test]
fn selects_even_values_at_or_above_minimum_in_an_exclusive_range() {
    let count: fn(u32, u32, u32) -> u32 = count_even_above;
    for (start, end, minimum, expected) in [(0, 0, 0, 0), (9, 2, 0, 0), (0, 1, 0, 1), (1, 2, 0, 0), (2, 2, 0, 0), (2, 3, 2, 1), (1, 9, 4, 3), (1, 9, 5, 2), (1, 8, 4, 2), (0, 10, 10, 0), (0, 10, 11, 0), (998, 1000, 998, 1)] {
        assert_eq!(count(start, end, minimum), expected);
    }
}`,
};

export const ownedUppercaseContract = {
  starter: `fn uppercase_owned(text: String) -> String {
    text
}
fn main() {
    let label = String::from("żółw");
    let upper = uppercase_owned(label);
    println!("{upper}");
}`,
  solution: `fn uppercase_owned(text: String) -> String {
    text.to_uppercase()
}
fn main() {
    let label = String::from("żółw");
    let upper = uppercase_owned(label);
    println!("{upper}");
}`,
  tests: `#[test]
fn consumes_a_string_and_returns_an_owned_unicode_transformation() {
    let transform: fn(String) -> String = uppercase_owned;
    for (input, expected) in [("", ""), ("rust", "RUST"), ("Rust 7!", "RUST 7!"), ("żółw 🦀", "ŻÓŁW 🦀"), ("straße", "STRASSE"), (" RUST ", " RUST ")] {
        let output: String = transform(String::from(input));
        assert_eq!(output, expected);
        let again: String = transform(output);
        assert_eq!(again, expected);
    }
}`,
};
