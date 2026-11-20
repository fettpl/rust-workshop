/** Trusted repository-authored candidates only; never compile learner input here. */
export const baselinePatternFixtures = [
  {
    lesson: "slices-and-views",
    step: "slice-prefix-practice",
    alternate: `fn sum_prefix(values: &[i32], end: usize) -> i32 { let mut sum = 0; for value in &values[..end] { sum += *value; } sum }`,
    mutants: [
      `fn sum_prefix(values: &[i32], _end: usize) -> i32 { values.iter().sum() }`,
      `fn sum_prefix(values: &[i32], end: usize) -> i32 { values[..end].iter().filter(|value| **value > 0).sum() }`,
    ],
  },
  {
    lesson: "option-and-absence",
    step: "option-checked-bonus",
    alternate: `fn checked_bonus(value: Option<i32>, bonus: i32) -> Option<i32> { value.and_then(|amount| amount.checked_add(bonus)) }`,
    mutants: [
      `fn checked_bonus(value: Option<i32>, bonus: i32) -> Option<i32> { value.map(|amount| amount.saturating_add(bonus)) }`,
      `fn checked_bonus(value: Option<i32>, bonus: i32) -> Option<i32> { Some(value.unwrap_or(0).wrapping_add(bonus)) }`,
    ],
  },
  {
    lesson: "nested-patterns-and-destructuring",
    step: "patterns-borrow-repair",
    alternate: `fn text_bytes(value: &Option<String>) -> Option<usize> { value.as_ref().map(|text| text.len()) }`,
    mutants: [
      `fn text_bytes(value: &Option<String>) -> Option<usize> { value.as_ref().filter(|text| !text.is_empty()).map(|text| text.len()) }`,
      `fn text_bytes(value: &Option<String>) -> Option<usize> { value.as_ref().map(|text| text.chars().count()) }`,
    ],
  },
  {
    lesson: "nested-patterns-and-destructuring",
    step: "patterns-let-else-repair",
    alternate: `fn present_label(value: &Option<String>) -> Option<&str> { match value { Some(text) => Some(text.as_str()), None => None } }`,
    mutants: [
      `fn present_label(value: &Option<String>) -> Option<&str> { Some(match value { Some(text) => text.as_str(), None => "" }) }`,
      `fn present_label(value: &Option<String>) -> Option<&str> { value.as_ref().filter(|text| !text.is_empty()).map(|text| text.as_str()) }`,
    ],
  },
  {
    lesson: "nested-patterns-and-destructuring",
    step: "patterns-delivery-transfer",
    alternate: `struct Delivery { label: String, remaining: Option<i32> }
fn delivery_label(delivery: &Delivery) -> Option<&str> { match delivery.remaining { None => None, Some(_) => Some(delivery.label.as_str()) } }
fn drain(delivery: &mut Delivery) -> usize { let mut count = 0; loop { match delivery.remaining { None => break, Some(n) => { count += 1; delivery.remaining = if n > 0 { Some(n - 1) } else { None }; } } } count }`,
    mutants: [
      `struct Delivery { label: String, remaining: Option<i32> }
fn delivery_label(delivery: &Delivery) -> Option<&str> { match delivery.remaining { Some(n) if n > 0 => Some(&delivery.label), _ => None } }
fn drain(delivery: &mut Delivery) -> usize { let mut count = 0; while let Some(n) = delivery.remaining { count += 1; delivery.remaining = if n > 0 { Some(n - 1) } else { None }; } count }`,
      `struct Delivery { label: String, remaining: Option<i32> }
fn delivery_label(delivery: &Delivery) -> Option<&str> { delivery.remaining.map(|_| delivery.label.as_str()) }
fn drain(delivery: &mut Delivery) -> usize { let count = delivery.remaining.map_or(0, |n| if n > 0 { n as usize + 1 } else { 1 }); delivery.remaining = Some(0); count }`,
    ],
  },
  {
    lesson: "trait-contracts",
    step: "contracts-derive-repair",
    alternate: `#[derive(Debug)] struct DerivedNote { text: String, attempts: u32 }
impl PartialEq for DerivedNote { fn eq(&self, other: &Self) -> bool { self.text == other.text && self.attempts == other.attempts } }
impl Eq for DerivedNote {}
#[derive(Debug, PartialEq, Eq)] struct ManualNote { text: String }
fn derived(text: String, attempts: u32) -> DerivedNote { DerivedNote { text, attempts } }
fn manual(text: String, _attempts: u32) -> ManualNote { ManualNote { text } }`,
    mutants: [
      `#[derive(Debug, PartialEq, Eq)] struct DerivedNote { text: String, attempts: u32 }
#[derive(Debug, PartialEq, Eq)] struct ManualNote { text: String, attempts: u32 }
fn derived(text: String, attempts: u32) -> DerivedNote { DerivedNote { text, attempts } }
fn manual(text: String, attempts: u32) -> ManualNote { ManualNote { text, attempts } }`,
      `#[derive(Debug, PartialEq, Eq)] struct DerivedNote { text: String, attempts: u32 }
#[derive(Debug, PartialEq, Eq)] struct ManualNote { attempts: u32 }
fn derived(text: String, attempts: u32) -> DerivedNote { DerivedNote { text, attempts } }
fn manual(_text: String, attempts: u32) -> ManualNote { ManualNote { attempts: attempts.min(0) } }`,
    ],
  },
];
