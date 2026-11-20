/** Fixed authored alternatives and semantic controls; imported only by maintainer verifiers. */
import { performanceRecoveryPractices } from "./performance-recovery-practice";

export interface PerformanceRecoveryFixture {
  id: string;
  equivalent: string;
  mutant: string;
  additionalMutants: Record<string, string>;
}

function source(id: string): string {
  const step = performanceRecoveryPractices.find(
    (entry) => entry.step.id === id,
  )?.step;
  if (!step?.solution) throw new Error(`Missing fixed practice ${id}`);
  return step.solution;
}
function replaced(id: string, before: string, after: string): string {
  const original = source(id);
  if (!original.includes(before))
    throw new Error(`Missing authored mutation ${id}/${before}`);
  return original.replaceAll(before, after);
}
function implementation(id: string, marker: string, body: string): string {
  const original = source(id);
  const offset = original.indexOf(marker);
  if (offset < 0) throw new Error(`Missing authored implementation ${id}`);
  return original.slice(0, offset) + body;
}

export const performanceRecoveryFixtures: PerformanceRecoveryFixture[] = [
  {
    id: "workload-prefix-transfer",
    equivalent: implementation(
      "workload-prefix-transfer",
      "fn inspect_prefix(",
      String.raw`fn inspect_prefix(items: &[u8], limit: usize, max_visits: usize, max_rejections: usize) -> PrefixEvidence {
    let visited = items.len().min(limit);
    let accepted = items[..visited].iter().filter(|byte| byte.is_ascii_digit()).count();
    let rejected = visited - accepted;
    PrefixEvidence { visited, accepted, rejected, within_limits: !(visited > max_visits || rejected > max_rejections) }
}`,
    ),
    mutant: replaced(
      "workload-prefix-transfer",
      "byte.is_ascii_digit()",
      "byte.is_ascii_lowercase()",
    ),
    additionalMutants: {
      "rejection-budget-ignored": replaced(
        "workload-prefix-transfer",
        " && rejected <= max_rejections",
        "",
      ),
      "prefix-limit-ignored": replaced(
        "workload-prefix-transfer",
        ".take(limit)",
        ".take(usize::MAX)",
      ),
    },
  },
  {
    id: "borrow-tagged-messages-transfer",
    equivalent: String.raw`fn select_messages<'a>(lines: &'a [&'a str], tag: &str) -> Vec<&'a str> {
    lines.iter().filter_map(|line| { let (label, message) = line.split_once(':')?; (label == tag).then_some(message) }).collect()
}`,
    mutant: replaced(
      "borrow-tagged-messages-transfer",
      ".split_once(':')",
      ".rsplit_once(':')",
    ),
    additionalMutants: {
      "order-reversed": replaced(
        "borrow-tagged-messages-transfer",
        "    messages\n}",
        "    messages.reverse();\n    messages\n}",
      ),
      "label-prefix": replaced(
        "borrow-tagged-messages-transfer",
        "label == tag",
        "label.starts_with(tag)",
      ),
    },
  },
  {
    id: "buffer-line-report-transfer",
    equivalent: implementation(
      "buffer-line-report-transfer",
      "fn inspect_lines<",
      String.raw`fn inspect_lines<R: BufRead>(mut reader: R, scratch: &mut String, limit: usize) -> io::Result<BufferReport> {
    let mut peak_capacity = scratch.capacity();
    let lengths = std::iter::from_fn(|| {
        scratch.clear();
        match reader.read_line(scratch) {
            Ok(bytes) => { peak_capacity = peak_capacity.max(scratch.capacity()); if bytes == 0 { None } else { Some(Ok(bytes)) } },
            Err(error) => Some(Err(error)),
        }
    }).collect::<io::Result<Vec<usize>>>()?;
    Ok(BufferReport { lengths, peak_capacity, within_limit: peak_capacity <= limit })
}`,
    ),
    mutant: replaced(
      "buffer-line-report-transfer",
      "reader.read_line(scratch)?",
      "reader.read_line(&mut String::new())?",
    ),
    additionalMutants: {
      "read-error-retried": replaced(
        "buffer-line-report-transfer",
        "reader.read_line(scratch)?",
        "reader.read_line(scratch).or_else(|_| reader.read_line(scratch))?",
      ),
      "length-is-capacity": replaced(
        "buffer-line-report-transfer",
        "scratch.capacity()",
        "scratch.len()",
      ),
      "eof-is-record": replaced(
        "buffer-line-report-transfer",
        "if bytes == 0 { break; }\n        lengths.push(bytes);",
        "lengths.push(bytes);\n        if bytes == 0 { break; }",
      ),
    },
  },
  {
    id: "decision-batch-audit-transfer",
    equivalent: implementation(
      "decision-batch-audit-transfer",
      "fn audit_costs(",
      String.raw`fn audit_costs(rows: &[CostRow]) -> (Vec<CostDecision>, bool) {
    let decisions: Vec<_> = rows.iter().map(|row| match (row.candidate <= row.budget, row.candidate <= row.baseline) {
        (false, _) => CostDecision::Budget, (true, false) => CostDecision::Regression, (true, true) => CostDecision::Keep,
    }).collect();
    let kept = !decisions.is_empty() && !decisions.iter().any(|decision| *decision != CostDecision::Keep);
    (decisions, kept)
}`,
    ),
    mutant: replaced(
      "decision-batch-audit-transfer",
      "row.candidate > row.budget { CostDecision::Budget }\n            else if row.candidate > row.baseline { CostDecision::Regression }",
      "row.candidate > row.baseline { CostDecision::Regression }\n            else if row.candidate > row.budget { CostDecision::Budget }",
    ),
    additionalMutants: {
      "one-good-row-hides-failure": replaced(
        "decision-batch-audit-transfer",
        ".all(|decision|",
        ".any(|decision|",
      ),
    },
  },
  {
    id: "instruction-batch-budget-transfer",
    equivalent: String.raw`#[derive(Debug, PartialEq, Eq)]
struct TraceRecord { label: &'static str, steps: usize }
fn record_trace_batch(traces: &[&[&str]]) -> Vec<TraceRecord> {
    let mut records = Vec::new();
    for trace in traces { let steps = trace.iter().count(); records.push(TraceRecord { label: "parser", steps }); }
    records
}
fn instruction_batch_fits(costs: &[usize], per_item: usize, total_limit: usize) -> bool {
    let mut remaining = total_limit;
    for &cost in costs { if cost > per_item || cost > remaining { return false; } remaining -= cost; }
    true
}`,
    mutant: replaced(
      "instruction-batch-budget-transfer",
      "total <= total_limit",
      "total < total_limit",
    ),
    additionalMutants: {
      "hidden-trace-step": replaced(
        "instruction-batch-budget-transfer",
        "steps: trace.len()",
        "steps: trace.len() + 1",
      ),
      "per-item-limit-ignored": replaced(
        "instruction-batch-budget-transfer",
        "if cost > per_item { return false; }",
        "",
      ),
      "overflow-saturated": replaced(
        "instruction-batch-budget-transfer",
        "match total.checked_add(cost) { Some(value) => value, None => return false }",
        "total.saturating_add(cost)",
      ),
    },
  },
  {
    id: "allocation-site-bytes-transfer",
    equivalent: implementation(
      "allocation-site-bytes-transfer",
      "fn allocated_at(",
      String.raw`fn allocated_at(events: &[HeapEvent<'_>], site: &str) -> Option<usize> {
    events.iter().filter(|event| event.allocated && event.site == site).try_fold(0usize, |sum, event| sum.checked_add(event.bytes))
}`,
    ),
    mutant: replaced(
      "allocation-site-bytes-transfer",
      "event.allocated && event.site == site",
      "event.site == site",
    ),
    additionalMutants: {
      "site-filter-ignored": replaced(
        "allocation-site-bytes-transfer",
        "event.allocated && event.site == site",
        "event.allocated",
      ),
    },
  },
  {
    id: "optimization-trial-batch-transfer",
    equivalent: implementation(
      "optimization-trial-batch-transfer",
      "fn compare_trials(",
      String.raw`fn compare_trials(baseline: &Trial<'_>, candidates: &[Trial<'_>]) -> Vec<Option<(usize, usize)>> {
    candidates.iter().map(|candidate| match (baseline.input == candidate.input, baseline.output == candidate.output) {
        (true, true) => Some((baseline.instructions.saturating_sub(candidate.instructions), baseline.allocations.saturating_sub(candidate.allocations))),
        _ => None,
    }).collect()
}`,
    ),
    mutant: replaced(
      "optimization-trial-batch-transfer",
      "baseline.instructions.saturating_sub(candidate.instructions)",
      "baseline.instructions - candidate.instructions",
    ),
    additionalMutants: {
      "output-identity-ignored": replaced(
        "optimization-trial-batch-transfer",
        " && baseline.output == candidate.output",
        "",
      ),
    },
  },
  {
    id: "profile-regression-batch-transfer",
    equivalent: implementation(
      "profile-regression-batch-transfer",
      "fn judge_samples(",
      String.raw`fn judge_samples(samples: &[RegressionSample]) -> Vec<Verdict> {
    samples.iter().map(|sample| match (sample.correct, sample.candidate.checked_sub(sample.baseline)) {
        (false, _) => Verdict::WrongOutput,
        (true, None) => Verdict::Keep,
        (true, Some(increase)) if increase <= sample.allowance => Verdict::Keep,
        _ => Verdict::CostRegression,
    }).collect()
}`,
    ),
    mutant: replaced(
      "profile-regression-batch-transfer",
      "<= sample.allowance",
      "< sample.allowance",
    ),
    additionalMutants: {
      "correctness-ignored": replaced(
        "profile-regression-batch-transfer",
        "if !sample.correct",
        "if false",
      ),
    },
  },
];

export const performancePracticeFixtures = performanceRecoveryFixtures.filter(
  (fixture) =>
    performanceRecoveryPractices.some(
      (entry) =>
        entry.step.id === fixture.id &&
        entry.lessonId.startsWith("performance-"),
    ),
);
export const profilePracticeFixtures = performanceRecoveryFixtures.filter(
  (fixture) =>
    performanceRecoveryPractices.some(
      (entry) =>
        entry.step.id === fixture.id && entry.lessonId.startsWith("profile-"),
    ),
);
