/** Maintained candidates grouped by exact task reference; no runtime learner input. */
import {
  coreConversionsLessons,
  coreConversionsReviewExercises,
} from "./core-conversions";

type Candidate = {
  name: string;
  source: string;
  outcome: "pass" | "assertion-failure" | "E0277";
};
const tasks = [
  ...coreConversionsLessons.flatMap((lesson) => lesson.steps),
  ...Object.values(coreConversionsReviewExercises),
];
function solution(id: string): string {
  const source = tasks.find((step) => step.id === id)?.solution;
  if (!source) throw new Error(`Missing maintained conversion solution: ${id}`);
  return source;
}
function changed(
  id: string,
  name: string,
  before: string,
  after: string,
  outcome: Candidate["outcome"],
): Candidate {
  const reference = solution(id);
  if (!reference.includes(before))
    throw new Error(`Stale conversion fixture: ${id}/${name}`);
  return { name, source: reference.replace(before, after), outcome };
}
const byte = "conversions-read-api";
const label = "conversions-label-repair";
const samples = "conversions-samples-transfer";
const note = "review-from-owned-conversions";
const bytes = "review-asref-borrowed-views";
export const coreConversionsFixtures: Record<string, Candidate[]> = {
  [byte]: [
    changed(
      byte,
      "qualified-view",
      "value.as_ref().len()",
      "<T as AsRef<str>>::as_ref(value).as_bytes().len()",
      "pass",
    ),
    changed(
      byte,
      "constant-length",
      "value.as_ref().len()",
      "8",
      "assertion-failure",
    ),
    changed(
      byte,
      "character-count",
      "value.as_ref().len()",
      "value.as_ref().chars().count()",
      "assertion-failure",
    ),
    changed(
      byte,
      "display-bound",
      "AsRef<str> + ?Sized",
      "AsRef<str> + std::fmt::Display + ?Sized",
      "E0277",
    ),
    changed(
      byte,
      "clone-bound",
      "AsRef<str> + ?Sized",
      "AsRef<str> + Clone + ?Sized",
      "E0277",
    ),
  ],
  [label]: [
    changed(
      label,
      "explicit-str-view",
      "{ &self.0 }",
      "{ self.0.as_str() }",
      "pass",
    ),
    changed(
      label,
      "trim-storage",
      "Self(text)",
      "Self(text.trim().to_owned())",
      "assertion-failure",
    ),
    changed(
      label,
      "empty-fallback",
      "{ &self.0 }",
      '{ "" }',
      "assertion-failure",
    ),
    changed(
      label,
      "leaked-equal-buffer",
      "{ &self.0 }",
      "{ Box::leak(self.0.clone().into_boxed_str()) }",
      "assertion-failure",
    ),
    changed(
      label,
      "cloned-storage",
      "Self(text)",
      "Self(text.clone())",
      "assertion-failure",
    ),
    changed(
      label,
      "inherent-view-only",
      "impl AsRef<str> for Label",
      "impl Label",
      "E0277",
    ),
  ],
  [samples]: [
    changed(
      samples,
      "slice-method",
      "{ &self.0 }",
      "{ self.0.as_slice() }",
      "pass",
    ),
    changed(
      samples,
      "sorted-elements",
      "Self(values)",
      "{ let mut sorted = values; sorted.sort(); Self(sorted) }",
      "assertion-failure",
    ),
    changed(
      samples,
      "deduplicated-elements",
      "Self(values)",
      "{ let mut unique = Vec::new(); for value in values { if !unique.contains(&value) { unique.push(value); } } Self(unique) }",
      "assertion-failure",
    ),
    changed(
      samples,
      "first-only",
      "Self(values)",
      "Self(values.into_iter().take(1).collect())",
      "assertion-failure",
    ),
    changed(
      samples,
      "cloned-storage",
      "Self(values)",
      "Self(values.clone())",
      "assertion-failure",
    ),
    changed(
      samples,
      "inherent-view-only",
      "impl AsRef<[i32]> for Samples",
      "impl Samples",
      "E0277",
    ),
  ],
  [note]: [
    changed(note, "named-construction", "Self(text)", "Note(text)", "pass"),
    changed(
      note,
      "wrong-content",
      "Self(text)",
      'Self(String::from("inna treść"))',
      "assertion-failure",
    ),
  ],
  [bytes]: [
    changed(
      bytes,
      "slice-method",
      "{ &self.0 }",
      "{ self.0.as_slice() }",
      "pass",
    ),
    changed(
      bytes,
      "missing-last-byte",
      "{ &self.0 }",
      "{ &self.0[..self.0.len().saturating_sub(1)] }",
      "assertion-failure",
    ),
    changed(
      bytes,
      "leaked-equal-buffer",
      "{ &self.0 }",
      "{ Box::leak(self.0.clone().into_boxed_slice()) }",
      "assertion-failure",
    ),
    changed(
      bytes,
      "inherent-view-only",
      "impl AsRef<[u8]> for Bytes",
      "impl Bytes",
      "E0277",
    ),
  ],
};
