import {
  nestedPatternLessons,
  nestedPatternReviewExercises,
} from "./nested-patterns";

export type NestedPatternFixtureOutcome =
  "pass" | "assertion-failure" | "compile-error";

export interface NestedPatternFixture {
  name: string;
  source: string;
  outcome: NestedPatternFixtureOutcome;
}

const lesson = nestedPatternLessons[0];
const repair = lesson.steps.find((step) => step.id === "nested-repair")!;
const transfer = lesson.steps.find((step) => step.id === "nested-transfer")!;
const review = nestedPatternReviewExercises["nested-pattern-matching"];

const failedAsMissing = `
#[derive(Debug, PartialEq)] enum ReadingState { Ready { value: i32 }, Failed }
#[derive(Debug, PartialEq)] struct Reading { label: String, state: Option<ReadingState> }
fn describe(reading: &Reading) -> &'static str {
    match &reading.state {
        Some(ReadingState::Ready { value }) if *value > 0 => "ready",
        Some(ReadingState::Ready { .. }) => "ready-nonpositive",
        Some(ReadingState::Failed) => "missing",
        None => "missing",
    }
}
`;
const readyAlways = `
#[derive(Debug, PartialEq)] enum ReadingState { Ready { value: i32 }, Failed }
#[derive(Debug, PartialEq)] struct Reading { label: String, state: Option<ReadingState> }
fn describe(reading: &Reading) -> &'static str {
    match &reading.state {
        Some(ReadingState::Ready { .. }) => "ready",
        Some(ReadingState::Failed) => "failed",
        None => "missing",
    }
}
`;
const repairEquivalent = `
#[derive(Debug, PartialEq)] enum ReadingState { Ready { value: i32 }, Failed }
#[derive(Debug, PartialEq)] struct Reading { label: String, state: Option<ReadingState> }
fn describe(reading: &Reading) -> &'static str {
    if let Some(state) = &reading.state {
        match state {
            ReadingState::Ready { value } if *value > 0 => "ready",
            ReadingState::Ready { .. } => "ready-nonpositive",
            ReadingState::Failed => "failed",
        }
    } else {
        "missing"
    }
}
`;
const ignoresUrgent = `
#[derive(Debug, PartialEq)] enum Notice { Disabled, Ready { detail: Option<Details> } }
#[derive(Debug, PartialEq)] struct Details { urgent: bool, headline: String }
fn needs_attention(notice: &Notice) -> bool {
    match notice {
        Notice::Disabled => false,
        Notice::Ready { detail: Some(details) } => !details.headline.is_empty(),
        Notice::Ready { detail: None } => false,
    }
}
`;
const acceptsEmpty = `
#[derive(Debug, PartialEq)] enum Notice { Disabled, Ready { detail: Option<Details> } }
#[derive(Debug, PartialEq)] struct Details { urgent: bool, headline: String }
fn needs_attention(notice: &Notice) -> bool {
    match notice {
        Notice::Disabled => false,
        Notice::Ready { detail: Some(details) } => details.urgent,
        Notice::Ready { detail: None } => false,
    }
}
`;
const borrowedEquivalent = `
#[derive(Debug, PartialEq)] enum Notice { Disabled, Ready { detail: Option<Details> } }
#[derive(Debug, PartialEq)] struct Details { urgent: bool, headline: String }
fn needs_attention(notice: &Notice) -> bool {
    if let Notice::Ready { detail: Some(details) } = notice {
        details.urgent && !details.headline.is_empty()
    } else {
        false
    }
}
`;
const bannerSomeEmptyAbsent = `
#[derive(Debug, PartialEq)] enum Banner { Off, On { message: Option<String> } }
fn has_message(banner: &Banner) -> bool {
    match banner {
        Banner::Off => false,
        Banner::On { message: Some(message) } => !message.is_empty(),
        Banner::On { message: None } => false,
    }
}
`;
const bannerEquivalent = `
#[derive(Debug, PartialEq)] enum Banner { Off, On { message: Option<String> } }
fn has_message(banner: &Banner) -> bool {
    if let Banner::On { message: Some(_) } = banner { true } else { false }
}
`;
const bannerNonePresent = `
#[derive(Debug, PartialEq)] enum Banner { Off, On { message: Option<String> } }
fn has_message(banner: &Banner) -> bool {
    match banner {
        Banner::Off => false,
        Banner::On { message: Some(_) } => true,
        Banner::On { message: None } => true,
    }
}
`;

export const nestedPatternFixtures: Record<string, NestedPatternFixture[]> = {
  "nested-repair": [
    { name: "starter-e0004", source: repair.code!, outcome: "compile-error" },
    { name: "authored-solution", source: repair.solution!, outcome: "pass" },
    { name: "equivalent-if-let", source: repairEquivalent, outcome: "pass" },
    {
      name: "failed-as-missing",
      source: failedAsMissing,
      outcome: "assertion-failure",
    },
    { name: "ready-always", source: readyAlways, outcome: "assertion-failure" },
  ],
  "nested-transfer": [
    { name: "authored-solution", source: transfer.solution!, outcome: "pass" },
    {
      name: "borrowed-equivalent",
      source: borrowedEquivalent,
      outcome: "pass",
    },
    {
      name: "ignores-urgent",
      source: ignoresUrgent,
      outcome: "assertion-failure",
    },
    {
      name: "accepts-empty",
      source: acceptsEmpty,
      outcome: "assertion-failure",
    },
  ],
  "review-nested-pattern-matching": [
    { name: "authored-solution", source: review.solution!, outcome: "pass" },
    { name: "equivalent-if-let", source: bannerEquivalent, outcome: "pass" },
    {
      name: "some-empty-as-absent",
      source: bannerSomeEmptyAbsent,
      outcome: "assertion-failure",
    },
    {
      name: "none-as-present",
      source: bannerNonePresent,
      outcome: "assertion-failure",
    },
  ],
};
