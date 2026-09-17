import {
  propertyCounterexampleLessons,
  propertyCounterexampleReviewExercises,
} from "./property-counterexamples";

const shrinkGateEquivalent = `#[derive(Clone, Debug, PartialEq, Eq)]
struct SearchCase { context: usize, query: String, lines: Vec<String> }
#[derive(Clone, Debug, PartialEq, Eq)]
struct SavedCounterexample { schema_version: u8, contract_id: String, case: SearchCase, failure: String, digest: u64 }
fn case_size(case: &SearchCase) -> usize { case.lines.len() + case.query.len() + case.lines.iter().map(String::len).sum::<usize>() + case.context }
fn shrink_failure<F>(original: SearchCase, fails: F) -> SearchCase where F: Fn(&SearchCase) -> bool + Copy {
    let mut current = original;
    if !fails(&current) { return current; }
    let mut budget = 64;
    loop {
        let mut improved = false;
        for index in 0..current.lines.len() {
            if budget == 0 { return current; }
            budget -= 1;
            let mut candidate = current.clone();
            candidate.lines.remove(index);
            if case_size(&candidate) < case_size(&current) && fails(&candidate) { current = candidate; improved = true; break; }
        }
        if improved { continue; }
        if !current.query.is_empty() {
            let mut candidate = current.clone(); candidate.query.pop();
            if budget > 0 { budget -= 1; if case_size(&candidate) < case_size(&current) && fails(&candidate) { current = candidate; continue; } }
        }
        for line_index in 0..current.lines.len() {
            if budget == 0 { return current; }
            budget -= 1;
            let mut candidate = current.clone(); candidate.lines[line_index].pop();
            if case_size(&candidate) < case_size(&current) && fails(&candidate) { current = candidate; improved = true; break; }
        }
        if improved { continue; }
        if current.context > 0 {
            let mut candidate = current.clone(); candidate.context -= 1;
            if budget > 0 { budget -= 1; if case_size(&candidate) < case_size(&current) && fails(&candidate) { current = candidate; continue; } }
        }
        return current;
    }
}
fn save_counterexample(case: SearchCase) -> SavedCounterexample { SavedCounterexample { schema_version: 1, contract_id: String::from("mini-grep-boundary-v1"), case, failure: String::from("selection-mismatch"), digest: 0x51_48_52_31 } }
fn boundary_failure(case: &SearchCase) -> bool { !case.lines.is_empty() && case.lines.iter().any(|line| line.contains(&case.query)) }
fn replay_counterexample(saved: &SavedCounterexample) -> Result<bool, &'static str> {
    match (saved.schema_version, saved.contract_id.as_str(), saved.digest) { (1, "mini-grep-boundary-v1", 0x51_48_52_31) => Ok(saved.failure == "selection-mismatch" && boundary_failure(&saved.case)), _ => Err("stale-contract") }
}`;

const shrinkBlankEquivalent = `#[derive(Clone, Debug, PartialEq, Eq)]
struct ReadingCase { records: Vec<String>, filter: Option<String> }
const SCHEMA: &str = "reading-v1";
const CONTRACT: &str = "log-summary-v1";
const DIGEST: u64 = 0x52_45_41_44;
fn replay_reading_witness(encoded: &str) -> Result<bool, &'static str> {
    let mut parts = encoded.split('|');
    if parts.next() != Some(SCHEMA) { return Err("schema"); }
    if parts.next() != Some(CONTRACT) { return Err("contract"); }
    let digest = parts.next().ok_or("schema")?.parse::<u64>().map_err(|_| "schema")?;
    if digest != DIGEST { return Err("digest"); }
    let class = parts.next().ok_or("schema")?;
    if class != "matched" && class != "mismatch" { return Err("class"); }
    let filter = parts.next().ok_or("schema")?;
    let records: Vec<&str> = parts.collect();
    if records.is_empty() || records.iter().any(|record| record.is_empty()) { return Err("schema"); }
    let expected = matches!(filter, "ERROR");
    let observed = records.iter().any(|record| record.strip_prefix("ERROR:").is_some());
    let actual_class = if expected == observed { "matched" } else { "mismatch" };
    Ok(actual_class == class)
}`;

const shrinkRecallEquivalent = `#[derive(Clone, Debug, PartialEq, Eq)]
struct StreamCase { filter: Option<String>, chunks: Vec<String> }
const SCHEMA: &str = "stream-v1";
const CONTRACT: &str = "stream-summary-v1";
const DIGEST: u64 = 0x53_54_52_4d;
fn replay_stream_witness(encoded: &str) -> Result<usize, &'static str> {
    let mut parts = encoded.split('|');
    if parts.next() != Some(SCHEMA) { return Err("schema"); }
    if parts.next() != Some(CONTRACT) { return Err("contract"); }
    let digest = parts.next().ok_or("schema")?.parse::<u64>().map_err(|_| "schema")?;
    if digest != DIGEST { return Err("digest"); }
    let class = parts.next().ok_or("schema")?;
    if class != "matched" && class != "mismatch" { return Err("class"); }
    let expected_count = parts.next().ok_or("schema")?.parse::<usize>().map_err(|_| "schema")?;
    let filter = parts.next().ok_or("schema")?;
    let chunks: Vec<&str> = parts.collect();
    if chunks.is_empty() || chunks.iter().any(|chunk| chunk.is_empty()) { return Err("schema"); }
    let count = chunks.iter().filter(|chunk| filter == "ANY" || chunk.starts_with(filter)).count();
    let actual_class = if count == expected_count { "matched" } else { "mismatch" };
    if actual_class != class { return Err("class"); }
    Ok(count)
}`;

const metamorphicGateEquivalent = `fn selected(lines: &[String], query: &str, _context: usize) -> Vec<usize> {
    lines.iter().enumerate().filter(|(_, line)| line.contains(query)).map(|(index, _)| index).collect()
}
fn append_nonmatching_preserves(selected: fn(&[String], &str, usize) -> Vec<usize>, lines: &[String], query: &str, context: usize, suffix: &str) -> bool {
    if context != 0 || suffix.contains(query) { return false; }
    let mut extended = lines.to_vec(); extended.push(suffix.to_owned());
    selected(lines, query, context).as_slice() == selected(&extended, query, context).as_slice()
}`;

const metamorphicBlankEquivalent = `#[derive(Clone, Debug, PartialEq, Eq)]
struct Record { level: String, malformed: bool }
#[derive(Clone, Debug, PartialEq, Eq)]
struct Summary { info: usize, warn: usize, error: usize, malformed: usize }
fn summarize(records: &[Record], filter: Option<&str>) -> Summary {
    records.iter().fold(Summary { info: 0, warn: 0, error: 0, malformed: 0 }, |mut summary, record| {
        if record.malformed { summary.malformed += 1; return summary; }
        if filter.is_some_and(|value| value != record.level) { return summary; }
        match record.level.as_str() { "INFO" => summary.info += 1, "WARN" => summary.warn += 1, "ERROR" => summary.error += 1, _ => summary.malformed += 1 }
        summary
    })
}
fn permutation_preserves_summary(summarize: fn(&[Record], Option<&str>) -> Summary, original: &[Record], permuted: &[Record], filter: Option<&str>) -> bool {
    if filter.is_some() || original.len() != permuted.len() { return false; }
    let matches = |left: &[Record], right: &[Record]| left.iter().all(|record| right.iter().filter(|other| *other == record).count() == left.iter().filter(|other| *other == record).count());
    matches(original, permuted) && summarize(original, filter) == summarize(permuted, filter)
}`;

const metamorphicRecallEquivalent = `#[derive(Clone, Debug, PartialEq, Eq)]
struct Event { kind: String, accepted: bool }
fn observe(events: &[Event], _filter: Option<&str>) -> Vec<(String, bool)> { let mut result: Vec<(String, bool)> = events.iter().map(|event| (event.kind.clone(), event.accepted)).collect(); result.sort_by(|left, right| left.cmp(right)); result }
fn streaming_relation(observe: fn(&[Event], Option<&str>) -> Vec<(String, bool)>, base: &[Event], permuted: &[Event], filter: Option<&str>) -> bool {
    if filter.is_some() || base.len() != permuted.len() { return false; }
    observe(base, filter) == observe(permuted, filter)
}`;

const shrinkGateMutant = shrinkGateEquivalent.replace(
  /if case_size\(&candidate\) < case_size\(&current\) && fails\(&candidate\)/g,
  "if false && fails(&candidate)",
);
const shrinkBlankMutant = shrinkBlankEquivalent.replace(
  'if records.is_empty() || records.iter().any(|record| record.is_empty()) { return Err("schema"); }',
  'if records.is_empty() { return Err("schema"); }',
);
const shrinkRecallMutant = shrinkRecallEquivalent.replace(
  'if chunks.is_empty() || chunks.iter().any(|chunk| chunk.is_empty()) { return Err("schema"); }',
  'if chunks.is_empty() { return Err("schema"); }',
);
const metamorphicGateMutant = `fn selected(lines: &[String], query: &str, _context: usize) -> Vec<usize> { lines.iter().enumerate().filter_map(|(index, line)| line.contains(query).then_some(index)).collect() }
fn append_nonmatching_preserves(selected: fn(&[String], &str, usize) -> Vec<usize>, lines: &[String], query: &str, _context: usize, suffix: &str) -> bool {
    let before = selected(lines, query, 0).len();
    let mut extended = lines.to_vec(); extended.push(String::from(suffix));
    before == selected(&extended, query, 0).len()
}`;
const metamorphicBlankMutant = metamorphicBlankEquivalent
  .replace(
    "if filter.is_some() || original.len() != permuted.len() { return false; }",
    "if original.len() != permuted.len() { return false; }",
  )
  .replace(
    "matches(original, permuted) && summarize(original, filter) == summarize(permuted, filter)",
    "matches(original, permuted) && { let left = summarize(original, filter); let right = summarize(permuted, filter); left.info + left.warn + left.error + left.malformed == right.info + right.warn + right.error + right.malformed }",
  );
const metamorphicRecallMutant = metamorphicRecallEquivalent
  .replace(
    "if filter.is_some() || base.len() != permuted.len() { return false; }",
    "if base.len() != permuted.len() { return false; }",
  )
  .replace(
    "observe(base, filter) == observe(permuted, filter)",
    "observe(base, filter).len() == observe(permuted, filter).len()",
  );

const assessments = [
  ...propertyCounterexampleLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(propertyCounterexampleReviewExercises),
];

export const propertyCounterexampleAssessmentFixtures = assessments.map(
  (step) => {
    const variants: Record<string, [string, string]> = {
      "property-shrinking-replay-gate": [
        shrinkGateEquivalent,
        shrinkGateMutant,
      ],
      "property-shrinking-replay-blank": [
        shrinkBlankEquivalent,
        shrinkBlankMutant,
      ],
      "property-shrinking-replay-recall": [
        shrinkRecallEquivalent,
        shrinkRecallMutant,
      ],
      "property-metamorphic-transfer-gate": [
        metamorphicGateEquivalent,
        metamorphicGateMutant,
      ],
      "property-metamorphic-transfer-blank": [
        metamorphicBlankEquivalent,
        metamorphicBlankMutant,
      ],
      "property-metamorphic-transfer-recall": [
        metamorphicRecallEquivalent,
        metamorphicRecallMutant,
      ],
      "property-shrinking-replay-review": [
        shrinkRecallEquivalent,
        shrinkRecallMutant,
      ],
      "property-metamorphic-transfer-review": [
        metamorphicRecallEquivalent,
        metamorphicRecallMutant,
      ],
    };
    const [equivalent, mutant] = variants[step.id] ?? ["", ""];
    return { id: step.id, equivalent, mutant };
  },
);
